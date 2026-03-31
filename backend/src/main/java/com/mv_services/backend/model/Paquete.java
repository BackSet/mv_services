package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
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

    private Double pesoLbs;

    private Double pesoKgs;

    private String contenido;

    @ManyToOne
    @JoinColumn(name = "consolidado_id")
    @JsonIgnoreProperties({"paquetes"})
    private Consolidado consolidado;

    @Column(name = "fecha_registro")
    private LocalDateTime fechaRegistro;
}
