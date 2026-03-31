package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "consolidados")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Consolidado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String numeroGuia;

    private Double pesoTotalLbs;

    private Double pesoTotalKgs;

    @Enumerated(EnumType.STRING)
    private ConsolidadoEstado estado;

    // Importante: NO usar CascadeType.REMOVE/ALL aquí, para que eliminar un consolidado
    // no elimine los paquetes asociados. El borrado se maneja desde el controlador
    // desvinculando paquetes antes de eliminar el consolidado.
    @OneToMany(mappedBy = "consolidado", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JsonIgnoreProperties({"consolidado", "shipper"})
    @Builder.Default
    private List<Paquete> paquetes = new ArrayList<>();
}

