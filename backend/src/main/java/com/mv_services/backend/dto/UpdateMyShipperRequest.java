package com.mv_services.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateMyShipperRequest {

    @NotBlank
    @Size(max = 255)
    private String nombre;

    @Size(max = 255)
    private String codigoInterno;

    @Size(max = 255)
    private String nombreEncargado;
}
