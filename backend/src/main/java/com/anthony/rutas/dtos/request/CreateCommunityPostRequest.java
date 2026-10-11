package com.anthony.rutas.dtos.request;

import com.anthony.rutas.entities.PostCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCommunityPostRequest {

    @NotBlank(message = "El alias es obligatorio")
    @Size(min = 2, max = 40, message = "El alias debe tener entre 2 y 40 caracteres")
    private String authorAlias;

    @NotNull(message = "La categoría es obligatoria")
    private PostCategory category;

    @NotBlank(message = "El contenido es obligatorio")
    @Size(min = 4, max = 600, message = "La publicación debe tener entre 4 y 600 caracteres")
    private String content;

    private UUID routeId;

    private UUID cityId;
}

