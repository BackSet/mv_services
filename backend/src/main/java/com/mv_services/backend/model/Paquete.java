package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "paquetes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Paquete {

    /** Factor de conversión libras → kilogramos (un solo source of truth en backend). */
    public static final double LBS_TO_KGS = 0.45359237d;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String numeroGuia;

    @ManyToOne
    @JoinColumn(name = "shipper_id")
    @JsonIgnoreProperties({"telefonos", "direcciones"})
    private Shipper shipper;

    private String destinatario;

    @Column(name = "ref")
    private String ref;

    /**
     * Único peso real persistido. El peso en kilogramos se deriva siempre
     * de este valor para evitar inconsistencias.
     */
    private Double pesoLbs;

    private String contenido;

    @ManyToOne
    @JoinColumn(name = "consolidado_id")
    @JsonIgnoreProperties({"paquetes"})
    private Consolidado consolidado;

    /**
     * Posición del paquete dentro del consolidado al que pertenece (1-based).
     * Es calculada por el backend y no debe ser editada por el cliente.
     * Se actualiza al agregar, quitar o cuando se elimina algún paquete del consolidado.
     */
    @Column(name = "posicion_en_consolidado")
    private Integer posicionEnConsolidado;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;

    /**
     * Peso en kilogramos derivado del peso en libras. Se expone en el JSON
     * pero NO se persiste (se ignora si llega en el request).
     */
    @Transient
    @JsonProperty(value = "pesoKgs", access = JsonProperty.Access.READ_ONLY)
    public Double getPesoKgs() {
        if (pesoLbs == null) return null;
        return pesoLbs * LBS_TO_KGS;
    }
}
