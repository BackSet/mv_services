package com.mv_services.backend.repository;

import com.mv_services.backend.model.EstadoSolicitudShipper;
import com.mv_services.backend.model.ShipperSolicitud;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ShipperSolicitudRepository extends JpaRepository<ShipperSolicitud, Long> {

    List<ShipperSolicitud> findByEstadoOrderByFechaSolicitudDesc(EstadoSolicitudShipper estado);

    List<ShipperSolicitud> findAllByOrderByFechaSolicitudDesc();

    long countByEstado(EstadoSolicitudShipper estado);

    Optional<ShipperSolicitud> findFirstByUsernameIgnoreCaseOrderByFechaSolicitudDesc(String username);

    Optional<ShipperSolicitud> findFirstByEmailIgnoreCaseOrderByFechaSolicitudDesc(String email);

    boolean existsByUsernameIgnoreCaseAndEstado(String username, EstadoSolicitudShipper estado);

    boolean existsByEmailIgnoreCaseAndEstado(String email, EstadoSolicitudShipper estado);
}
