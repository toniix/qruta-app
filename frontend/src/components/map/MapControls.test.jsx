import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MapControls } from "./MapControls";

describe("MapControls component", () => {
  it("renders zoom in, zoom out, and GPS button", () => {
    render(
      <MapControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRecenterGPS={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Acercar mapa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Alejar mapa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activar mi ubicación GPS" }),
    ).toBeInTheDocument();
  });

  it("reflects inactive state when gpsReady is false", () => {
    render(
      <MapControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRecenterGPS={vi.fn()}
        gpsReady={false}
        isLocating={false}
      />,
    );

    const gpsBtn = screen.getByRole("button", {
      name: "Activar mi ubicación GPS",
    });
    expect(gpsBtn.className).toContain("text-slate-400");
    expect(gpsBtn.className).not.toContain("border-brand-lime");
  });

  it("reflects active state with brand lime styling when gpsReady is true", () => {
    render(
      <MapControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRecenterGPS={vi.fn()}
        gpsReady={true}
        isLocating={false}
      />,
    );

    const gpsBtn = screen.getByRole("button", {
      name: "Centrar en mi ubicación GPS",
    });
    expect(gpsBtn.className).toContain("text-brand-lime");
    expect(gpsBtn.className).toContain("border-brand-lime");
  });

  it("reflects locating state with spinner when isLocating is true", () => {
    render(
      <MapControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRecenterGPS={vi.fn()}
        gpsReady={false}
        isLocating={true}
      />,
    );

    const gpsBtn = screen.getByRole("button", {
      name: "Obteniendo ubicación GPS...",
    });
    expect(gpsBtn).toBeDisabled();
    expect(gpsBtn.className).toContain("animate-pulse");
  });

  it("calls onRecenterGPS when clicking GPS button", () => {
    const onRecenterGPS = vi.fn();
    render(
      <MapControls
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onRecenterGPS={onRecenterGPS}
        gpsReady={false}
      />,
    );

    const gpsBtn = screen.getByRole("button", {
      name: "Activar mi ubicación GPS",
    });
    fireEvent.click(gpsBtn);
    expect(onRecenterGPS).toHaveBeenCalledTimes(1);
  });
});
