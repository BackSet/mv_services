package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shippers_telefonos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Telefono {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numero;

    private String etiqueta;

    private Boolean esPrincipal;

    @ManyToOne
    @JoinColumn(name = "shipper_id")
    @JsonIgnore
    private Shipper shipper;
}

