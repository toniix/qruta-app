package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCommunityCommentRequest {

    @NotBlank(message = "El alias es obligatorio")
    @Size(min = 2, max = 40, message = "El alias debe tener entre 2 y 40 caracteres")
    private String authorAlias;

    @NotBlank(message = "El comentario no puede estar vacío")
    @Size(min = 2, max = 400, message = "El comentario debe tener entre 2 y 400 caracteres")
    private String content;

    /** Honeypot anti-spam: debe llegar vacío. */
    private String website;
}

