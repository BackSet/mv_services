package com.mv_services.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteRegistroMinimoRequest {

    @NotBlank
    @JsonAlias({"numeroGuiaInterno", "numero_guia"})
    private String numeroGuia;

    /**
     * Peso en libras. Si envías "peso" se interpreta como lbs.
     * Es el único peso almacenado en el sistema. Si llega "pesoKgs",
     * el backend lo convierte a libras antes de persistirlo.
     */
    @JsonAlias({"peso", "pesoLbs"})
    private Double pesoLbs;

    /**
     * (Compatibilidad) Peso en kilogramos. El backend lo convierte a libras
     * y descarta el valor original. NO se persiste en kgs.
     */
    @JsonAlias({"pesoKgs"})
    private Double pesoKgs;

    @NotBlank
    @JsonAlias({"contenido", "descripcion", "descripción"})
    private String contenido;

    /**
     * Nombre de la persona de destino.
     */
    @NotBlank
    @JsonAlias({"destinatario", "destinatarioNombre", "nombreDestinatarioFinal"})
    private String destinatario;

    @JsonAlias({"ref", "referencia"})
    private String ref;

    /**
     * (Opcional) Shipper al que se asociará el paquete en registro operario/ops.
     * Para usuarios con rol SHIPPER se ignora y se usa el shipper del usuario autenticado.
     */
    @JsonAlias({"shipperId", "shipper_id"})
    private Long shipperId;
}

