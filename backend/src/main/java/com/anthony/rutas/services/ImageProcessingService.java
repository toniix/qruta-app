package com.anthony.rutas.services;

import com.anthony.rutas.exceptions.BadRequestException;
import org.springframework.stereotype.Service;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;

/**
 * Normalizes admin-uploaded stop images so mobile clients get a light,
 * uniformly-encoded asset: validates the bytes decode, flattens transparency
 * onto white, downscales the longest side to {@value #MAX_DIMENSION}px (never
 * upscales), and re-encodes as JPEG at quality {@value #JPEG_QUALITY}.
 *
 * <p>Runs fully in memory - the backend has an ephemeral filesystem, so nothing
 * is ever written to disk.
 */
@Service
public class ImageProcessingService {

    /** Content type of every processed image. */
    public static final String OUTPUT_CONTENT_TYPE = "image/jpeg";
    /** Hard cap on the raw uploaded file size. */
    public static final int MAX_INPUT_BYTES = 2 * 1024 * 1024;
    /** Longest allowed side of the stored image. */
    public static final int MAX_DIMENSION = 1024;
    /**
     * Hard cap on declared source pixels (width * height) checked from the
     * image header BEFORE the full bitmap is decoded. {@code MAX_INPUT_BYTES}
     * only bounds the compressed input: a few hundred KB of declares a
     * multi-gigapixel canvas that would OOM the JVM while allocating the flat
     * RGB buffer. 25 MP is generous for phone-style uploads that already fit
     * in 2 MB.
     */
    public static final long MAX_PIXELS = 25_000_000L;

    private static final float JPEG_QUALITY = 0.8f;

    public byte[] toOptimizedJpeg(byte[] original) {
        if (original == null || original.length == 0) {
            throw new BadRequestException("Image file is empty");
        }

        BufferedImage source = decode(original);
        BufferedImage opaque = flattenOntoWhite(source);
        BufferedImage scaled = downscale(opaque);
        return encodeJpeg(scaled);
    }

    private BufferedImage decode(byte[] original) {
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(original))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw new BadRequestException("Unsupported or corrupt image file");
            }
            ImageReader reader = readers.next();
            try {
                // seekForwardOnly + ignoreMetadata: only the format header is
                // touched here, so the dimension check costs no pixel decode.
                reader.setInput(in, true, true);
                rejectHugeSource(reader.getWidth(0), reader.getHeight(0));
                ImageReadParam param = reader.getDefaultReadParam();
                BufferedImage image = reader.read(0, param);
                if (image == null) {
                    throw new BadRequestException("Unsupported or corrupt image file");
                }
                return image;
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new BadRequestException("Could not read image file");
        }
    }

    /** Rejects declared dimensions that could exhaust the heap while decoding. */
    private void rejectHugeSource(int width, int height) {
        if (width <= 0 || height <= 0 || (long) width * height > MAX_PIXELS) {
            throw new BadRequestException("Image dimensions exceed the accepted size");
        }
    }

    /** Draws the source over a white background so PNG alpha is not black in JPEG. */
    private BufferedImage flattenOntoWhite(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        BufferedImage rgb = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.drawImage(source, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private BufferedImage downscale(BufferedImage source) {
        int width = source.getWidth();
        int height = source.getHeight();
        int longestSide = Math.max(width, height);
        if (longestSide <= MAX_DIMENSION) {
            return source;
        }

        double scale = (double) MAX_DIMENSION / longestSide;
        int targetWidth = Math.max(1, (int) Math.round(width * scale));
        int targetHeight = Math.max(1, (int) Math.round(height * scale));

        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scaled.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(source, 0, 0, targetWidth, targetHeight, null);
        g.dispose();
        return scaled;
    }

    private byte[] encodeJpeg(BufferedImage image) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("No JPEG ImageWriter available on this JVM");
        }
        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(JPEG_QUALITY);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ImageOutputStream imageOutputStream = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(imageOutputStream);
            writer.write(null, new IIOImage(image, null, null), param);
            imageOutputStream.flush();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to encode image as JPEG", ex);
        } finally {
            writer.dispose();
        }
        return out.toByteArray();
    }
}
