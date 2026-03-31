package com.mv_services.backend.model;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "shippers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shipper {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombre;

    private String codigoInterno;

    private String nombreEncargado;

    @OneToMany(mappedBy = "shipper", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Telefono> telefonos = new ArrayList<>();

    @OneToMany(mappedBy = "shipper", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DireccionShipper> direcciones = new ArrayList<>();
}

