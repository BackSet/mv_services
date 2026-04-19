package com.mv_services.backend.service;

import com.mv_services.backend.model.EstadoSolicitudShipper;
import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.Shipper;
import com.mv_services.backend.model.ShipperSolicitud;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.RolRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.repository.ShipperSolicitudRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ShipperSolicitudService {

    private final ShipperSolicitudRepository solicitudRepository;
    private final UsuarioRepository usuarioRepository;
    private final ShipperRepository shipperRepository;
    private final RolRepository rolRepository;

    @Transactional
    public ShipperSolicitud aprobar(Long id, String currentUsername) {
        ShipperSolicitud solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Solicitud no encontrada: " + id));

        if (solicitud.getEstado() != EstadoSolicitudShipper.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya fue resuelta: estado " + solicitud.getEstado());
        }

        if (usuarioRepository.findByUsername(solicitud.getUsername()).isPresent()) {
            throw new IllegalStateException("Ya existe un usuario con el username de la solicitud.");
        }
        if (usuarioRepository.findByEmail(solicitud.getEmail()).isPresent()) {
            throw new IllegalStateException("Ya existe un usuario con el email de la solicitud.");
        }

        Rol rolShipper = rolRepository.findByNombre("SHIPPER")
                .orElseGet(() -> rolRepository.save(Rol.builder().nombre("SHIPPER").build()));

        Shipper shipper = Shipper.builder()
                .nombre(solicitud.getShipperNombre())
                .codigoInterno(solicitud.getCodigoInterno())
                .nombreEncargado(solicitud.getNombreEncargado())
                .build();
        shipper = shipperRepository.save(shipper);

        Usuario usuario = Usuario.builder()
                .username(solicitud.getUsername())
                .email(solicitud.getEmail())
                .password(solicitud.getPasswordHash())
                .rol(rolShipper)
                .shipper(shipper)
                .activo(true)
                .build();
        usuario = usuarioRepository.save(usuario);

        solicitud.setEstado(EstadoSolicitudShipper.APROBADA);
        solicitud.setFechaResolucion(LocalDateTime.now());
        solicitud.setShipperCreadoId(shipper.getId());
        solicitud.setUsuarioCreadoId(usuario.getId());
        usuarioRepository.findByUsername(currentUsername)
                .ifPresent(u -> solicitud.setResueltaPorUsuarioId(u.getId()));
        return solicitudRepository.save(solicitud);
    }

    @Transactional
    public ShipperSolicitud rechazar(Long id, String motivo, String currentUsername) {
        if (motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("El motivo de rechazo es obligatorio.");
        }
        ShipperSolicitud solicitud = solicitudRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Solicitud no encontrada: " + id));

        if (solicitud.getEstado() != EstadoSolicitudShipper.PENDIENTE) {
            throw new IllegalStateException("La solicitud ya fue resuelta: estado " + solicitud.getEstado());
        }

        solicitud.setEstado(EstadoSolicitudShipper.RECHAZADA);
        solicitud.setMotivoRechazo(motivo.trim());
        solicitud.setFechaResolucion(LocalDateTime.now());
        usuarioRepository.findByUsername(currentUsername)
                .ifPresent(u -> solicitud.setResueltaPorUsuarioId(u.getId()));
        return solicitudRepository.save(solicitud);
    }
}
