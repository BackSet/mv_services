package com.mv_services.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload usado por el panel de administración para crear o editar usuarios.
 *
 * <p>El campo {@link #password} es obligatorio en creación y opcional en edición:
 * si llega vacío o {@code null} en un PUT, se conserva la contraseña actual.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UsuarioRequest {

    @NotBlank
    @Size(min = 3, max = 50)
    @Pattern(regexp = "^[a-zA-Z0-9._-]{3,50}$")
    private String username;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @Size(min = 8, max = 128)
    private String password;

    private RolRef rol;

    private ShipperRef shipper;

    @Builder.Default
    private boolean activo = true;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RolRef {
        private Long id;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShipperRef {
        private Long id;
    }
}
