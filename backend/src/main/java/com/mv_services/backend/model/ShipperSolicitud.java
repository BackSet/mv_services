package com.mv_services.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "shipper_solicitudes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShipperSolicitud {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String email;

    @Column(name = "password_hash", nullable = false)
    @JsonIgnore
    private String passwordHash;

    @Column(name = "shipper_nombre", nullable = false)
    private String shipperNombre;

    @Column(name = "codigo_interno")
    private String codigoInterno;

    @Column(name = "nombre_encargado")
    private String nombreEncargado;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private EstadoSolicitudShipper estado = EstadoSolicitudShipper.PENDIENTE;

    @Column(name = "motivo_rechazo", length = 500)
    private String motivoRechazo;

    @CreationTimestamp
    @Column(name = "fecha_solicitud", updatable = false)
    private LocalDateTime fechaSolicitud;

    @Column(name = "fecha_resolucion")
    private LocalDateTime fechaResolucion;

    @Column(name = "resuelta_por_usuario_id")
    private Long resueltaPorUsuarioId;

    @Column(name = "shipper_creado_id")
    private Long shipperCreadoId;

    @Column(name = "usuario_creado_id")
    private Long usuarioCreadoId;
}
