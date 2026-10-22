package com.anthony.rutas.services;

import com.anthony.rutas.exceptions.BadRequestException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("ImageProcessingService")
class ImageProcessingServiceTest {

    private final ImageProcessingService service = new ImageProcessingService();

    private static byte[] encode(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        assertTrue(ImageIO.write(image, format, out), "encoder for " + format + " must exist");
        return out.toByteArray();
    }

    private static BufferedImage rgb(int width, int height, Color color) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(color);
        g.fillRect(0, 0, width, height);
        g.dispose();
        return image;
    }

    @Test
    @DisplayName("Downscales the longest side to 1024 while preserving aspect ratio")
    void shouldDownscalePreservingAspectRatio() throws Exception {
        byte[] original = encode(rgb(3000, 1500, Color.BLUE), "png");

        byte[] result = service.toOptimizedJpeg(original);

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result));
        assertNotNull(decoded);
        assertEquals(1024, decoded.getWidth());
        assertEquals(512, decoded.getHeight());
    }

    @Test
    @DisplayName("Never upscales an image smaller than the max dimension")
    void shouldNotUpscaleSmallImages() throws Exception {
        byte[] original = encode(rgb(400, 200, Color.GREEN), "png");

        byte[] result = service.toOptimizedJpeg(original);

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result));
        assertNotNull(decoded);
        assertEquals(400, decoded.getWidth());
        assertEquals(200, decoded.getHeight());
    }

    @Test
    @DisplayName("Encodes the output as JPEG")
    void shouldEncodeJpeg() throws Exception {
        byte[] original = encode(rgb(800, 600, Color.RED), "png");

        byte[] result = service.toOptimizedJpeg(original);

        // JPEG magic number: FF D8 FF.
        assertTrue(result.length > 3);
        assertEquals((byte) 0xFF, result[0]);
        assertEquals((byte) 0xD8, result[1]);
        assertEquals((byte) 0xFF, result[2]);
        assertNotNull(ImageIO.read(new ByteArrayInputStream(result)));
    }

    @Test
    @DisplayName("Flattens PNG transparency onto a white background")
    void shouldFlattenTransparencyOntoWhite() throws Exception {
        BufferedImage argb = new BufferedImage(50, 50, BufferedImage.TYPE_INT_ARGB);
        // Fully transparent pixels (default); draw a small opaque square in the middle.
        Graphics2D g = argb.createGraphics();
        g.setColor(new Color(0, 0, 255, 255));
        g.fillRect(20, 20, 10, 10);
        g.dispose();
        byte[] original = encode(argb, "png");

        byte[] result = service.toOptimizedJpeg(original);

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(result));
        assertNotNull(decoded);
        // Top-left was transparent -> must become white, not black.
        Color corner = new Color(decoded.getRGB(0, 0));
        assertTrue(corner.getRed() > 240 && corner.getGreen() > 240 && corner.getBlue() > 240,
                "transparent area should be white but was " + corner);
    }

    @Test
    @DisplayName("Rejects bytes that are not a decodable image")
    void shouldRejectNonImageBytes() {
        byte[] garbage = "this is definitely not an image".getBytes();

        assertThrows(BadRequestException.class, () -> service.toOptimizedJpeg(garbage));
    }

    @Test
    @DisplayName("Rejects a small file whose declared pixel count exceeds the decode budget")
    void shouldRejectHugeDeclaredDimensions() {
        // 900 MP declared in a tiny PNG: 2 MB compressed, but decoding would OOM.
        byte[] bomb = minimalPngHeader(30_000, 30_000);

        assertThrows(BadRequestException.class, () -> service.toOptimizedJpeg(bomb));
    }

    @Test
    @DisplayName("Rejects images with degenerate zero dimensions")
    void shouldRejectZeroDimensions() {
        byte[] bogus = minimalPngHeader(0, 0);

        assertThrows(BadRequestException.class, () -> service.toOptimizedJpeg(bogus));
    }

    /**
     * Builds a syntactically valid PNG that only carries the signature and an
     * IHDR declaring the given dimensions (compressed data omitted). Enough
     * for the decoder to read the header dimensions but never to decode a
     * real bitmap, which keeps the assertion cheap for multi-hundred-MP sizes.
     */
    private static byte[] minimalPngHeader(int width, int height) {
        byte[] ihdrData = new byte[13];
        ihdrData[0] = (byte) (width >>> 24);
        ihdrData[1] = (byte) (width >>> 16);
        ihdrData[2] = (byte) (width >>> 8);
        ihdrData[3] = (byte) width;
        ihdrData[4] = (byte) (height >>> 24);
        ihdrData[5] = (byte) (height >>> 16);
        ihdrData[6] = (byte) (height >>> 8);
        ihdrData[7] = (byte) height;
        ihdrData[8] = 8;  // bit depth
        ihdrData[9] = 2;  // color type: truecolor RGB
        // compression/filter/interlace left as 0 by Java defaults

        CRC32 ihdrCrc = new CRC32();
        ihdrCrc.update(chunkType("IHDR"));
        ihdrCrc.update(ihdrData);
        CRC32 iendCrc = new CRC32();
        iendCrc.update(chunkType("IEND"));

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            out.write(new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A});
            writeInt(out, ihdrData.length);
            out.write(chunkType("IHDR"));
            out.write(ihdrData);
            writeInt(out, (int) ihdrCrc.getValue());
            writeInt(out, 0);
            out.write(chunkType("IEND"));
            writeInt(out, (int) iendCrc.getValue());
            return out.toByteArray();
        } catch (IOException never) {
            // ByteArrayOutputStream never throws IOException; unreachable.
            throw new IllegalStateException(never);
        }
    }

    private static byte[] chunkType(String type) {
        return type.getBytes(StandardCharsets.US_ASCII);
    }

    private static void writeInt(ByteArrayOutputStream out, int value) {
        out.write((value >>> 24) & 0xFF);
        out.write((value >>> 16) & 0xFF);
        out.write((value >>> 8) & 0xFF);
        out.write(value & 0xFF);
    }

    @Test
    @DisplayName("Exposes the JPEG content type and a 2 MB input cap")
    void shouldExposeConstants() {
        assertEquals("image/jpeg", ImageProcessingService.OUTPUT_CONTENT_TYPE);
        assertEquals(2 * 1024 * 1024, ImageProcessingService.MAX_INPUT_BYTES);
    }
}
