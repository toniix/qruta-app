package com.anthony.rutas.dtos.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateOperatorUserRequest {

    @Email(message = "Email must be valid")
    private String email;

    private String fullName;

    @Pattern(regexp = "OWNER|EDITOR", message = "Role must be OWNER or EDITOR")
    private String role;

    private Boolean active;
}
