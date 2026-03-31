package com.mv_services.backend.controller;

import com.mv_services.backend.model.DireccionShipper;
import com.mv_services.backend.model.Shipper;
import com.mv_services.backend.model.Telefono;
import com.mv_services.backend.repository.DireccionShipperRepository;
import com.mv_services.backend.repository.ShipperRepository;
import com.mv_services.backend.repository.TelefonoRepository;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shippers")
@CrossOrigin(origins = "*")
@PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN') or hasAuthority('paquetes.read') or hasAuthority('paquetes.update')")
public class ShipperController {

    private final ShipperRepository shipperRepository;
    private final TelefonoRepository telefonoRepository;
    private final DireccionShipperRepository direccionShipperRepository;

    public ShipperController(
            ShipperRepository shipperRepository,
            TelefonoRepository telefonoRepository,
            DireccionShipperRepository direccionShipperRepository
    ) {
        this.shipperRepository = shipperRepository;
        this.telefonoRepository = telefonoRepository;
        this.direccionShipperRepository = direccionShipperRepository;
    }

    @GetMapping
    public List<Shipper> getAll() {
        List<Shipper> shippers = shipperRepository.findAll();
        // Cargar colecciones (para respuestas completas con repositorios simples)
        for (Shipper shipper : shippers) {
            shipper.setTelefonos(telefonoRepository.findByShipperId(shipper.getId()));
            shipper.setDirecciones(direccionShipperRepository.findByShipperId(shipper.getId()));
        }
        return shippers;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public Shipper create(@RequestBody Shipper shipper) {
        shipper.setTelefonos(null);
        shipper.setDirecciones(null);
        return shipperRepository.save(shipper);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Shipper> getById(@PathVariable Long id) {
        return shipperRepository.findById(id)
                .map(shipper -> {
                    shipper.setTelefonos(telefonoRepository.findByShipperId(shipper.getId()));
                    shipper.setDirecciones(direccionShipperRepository.findByShipperId(shipper.getId()));
                    return ResponseEntity.ok(shipper);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Shipper> update(@PathVariable Long id, @RequestBody Shipper details) {
        return shipperRepository.findById(id)
                .map(shipper -> {
                    if (details.getNombre() != null) shipper.setNombre(details.getNombre());
                    if (details.getCodigoInterno() != null) shipper.setCodigoInterno(details.getCodigoInterno());
                    if (details.getNombreEncargado() != null) shipper.setNombreEncargado(details.getNombreEncargado());
                    Shipper saved = shipperRepository.save(shipper);
                    saved.setTelefonos(telefonoRepository.findByShipperId(saved.getId()));
                    saved.setDirecciones(direccionShipperRepository.findByShipperId(saved.getId()));
                    return ResponseEntity.ok(saved);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/telefonos")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Telefono> addTelefono(@PathVariable Long id, @RequestBody Telefono telefono) {
        return shipperRepository.findById(id)
                .map(shipper -> {
                    if (Boolean.TRUE.equals(telefono.getEsPrincipal())) {
                        List<Telefono> existentes = telefonoRepository.findByShipperId(shipper.getId());
                        for (Telefono t : existentes) {
                            t.setEsPrincipal(false);
                            telefonoRepository.save(t);
                        }
                    }
                    Telefono nuevo = new Telefono();
                    nuevo.setNumero(telefono.getNumero());
                    nuevo.setEtiqueta(telefono.getEtiqueta());
                    nuevo.setEsPrincipal(Boolean.TRUE.equals(telefono.getEsPrincipal()));
                    nuevo.setShipper(shipper);
                    return ResponseEntity.ok(telefonoRepository.save(nuevo));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/direcciones")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<DireccionShipper> addDireccion(@PathVariable Long id, @RequestBody DireccionShipper direccion) {
        return shipperRepository.findById(id)
                .map(shipper -> {
                    DireccionShipper nueva = new DireccionShipper();
                    nueva.setShipper(shipper);
                    nueva.setPais(direccion.getPais());
                    nueva.setCiudad(direccion.getCiudad());
                    nueva.setCanton(direccion.getCanton());
                    nueva.setDireccion(direccion.getDireccion());
                    nueva.setReferencia(direccion.getReferencia());
                    return ResponseEntity.ok(direccionShipperRepository.save(nueva));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/direcciones/{direccionId}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<DireccionShipper> updateDireccion(
            @PathVariable Long id,
            @PathVariable Long direccionId,
            @RequestBody DireccionShipper direccion
    ) {
        return direccionShipperRepository.findByIdAndShipperId(direccionId, id)
                .map(existente -> {
                    if (direccion.getPais() != null) existente.setPais(direccion.getPais());
                    if (direccion.getCiudad() != null) existente.setCiudad(direccion.getCiudad());
                    if (direccion.getCanton() != null) existente.setCanton(direccion.getCanton());
                    if (direccion.getDireccion() != null) existente.setDireccion(direccion.getDireccion());
                    if (direccion.getReferencia() != null) existente.setReferencia(direccion.getReferencia());
                    return ResponseEntity.ok(direccionShipperRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/telefonos/{telefonoId}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Telefono> updateTelefono(
            @PathVariable Long id,
            @PathVariable Long telefonoId,
            @RequestBody Telefono telefono
    ) {
        return telefonoRepository.findByIdAndShipperId(telefonoId, id)
                .map(existente -> {
                    if (telefono.getNumero() != null) existente.setNumero(telefono.getNumero());
                    if (telefono.getEtiqueta() != null) existente.setEtiqueta(telefono.getEtiqueta());
                    if (Boolean.TRUE.equals(telefono.getEsPrincipal())) {
                        List<Telefono> todos = telefonoRepository.findByShipperId(id);
                        for (Telefono t : todos) {
                            if (!t.getId().equals(telefonoId)) {
                                t.setEsPrincipal(false);
                                telefonoRepository.save(t);
                            }
                        }
                        existente.setEsPrincipal(true);
                    } else if (telefono.getEsPrincipal() != null) {
                        existente.setEsPrincipal(false);
                    }
                    return ResponseEntity.ok(telefonoRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/telefonos/{telefonoId}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Void> deleteTelefono(@PathVariable Long id, @PathVariable Long telefonoId) {
        return telefonoRepository.findByIdAndShipperId(telefonoId, id)
                .map(t -> {
                    telefonoRepository.delete(t);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/direcciones/{direccionId}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Void> deleteDireccion(@PathVariable Long id, @PathVariable Long direccionId) {
        return direccionShipperRepository.findByIdAndShipperId(direccionId, id)
                .map(d -> {
                    direccionShipperRepository.delete(d);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','MV_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (shipperRepository.existsById(id)) {
            shipperRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}

