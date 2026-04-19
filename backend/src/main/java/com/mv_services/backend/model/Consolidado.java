package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
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

    /** Único peso total persistido (libras). El total en kgs se deriva. */
    private Double pesoTotalLbs;

    @Enumerated(EnumType.STRING)
    private ConsolidadoEstado estado;

    // Importante: NO usar CascadeType.REMOVE/ALL aquí, para que eliminar un consolidado
    // no elimine los paquetes asociados. El borrado se maneja desde el controlador
    // desvinculando paquetes antes de eliminar el consolidado.
    @OneToMany(mappedBy = "consolidado", cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JsonIgnoreProperties({"consolidado", "shipper"})
    @OrderBy("posicionEnConsolidado ASC, id ASC")
    @Builder.Default
    private List<Paquete> paquetes = new ArrayList<>();

    /** Total de kilogramos derivado de las libras. Sólo lectura en JSON. */
    @Transient
    @JsonProperty(value = "pesoTotalKgs", access = JsonProperty.Access.READ_ONLY)
    public Double getPesoTotalKgs() {
        if (pesoTotalLbs == null) return null;
        return pesoTotalLbs * Paquete.LBS_TO_KGS;
    }
}
