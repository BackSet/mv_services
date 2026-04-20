package com.mv_services.backend.config;

import com.mv_services.backend.model.Permiso;
import com.mv_services.backend.model.Rol;
import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.PermisoRepository;
import com.mv_services.backend.repository.RolRepository;
import com.mv_services.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final UsuarioRepository usuarioRepository;
    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final PasswordEncoder passwordEncoder;

    @Bean
    public CommandLineRunner loadData() {
        return args -> {
            // 1) Permisos base
            Map<String, String> basePermisos = new LinkedHashMap<>();
            basePermisos.put("roles.manage", "Gestionar roles");
            basePermisos.put("permisos.manage", "Gestionar permisos");
            basePermisos.put("usuarios.manage", "Gestionar usuarios");

            basePermisos.put("paquetes.read", "Ver paquetes");
            basePermisos.put("paquetes.create_minimo", "Crear paquetes (registro mínimo)");
            basePermisos.put("paquetes.update", "Actualizar paquetes");
            basePermisos.put("paquetes.delete", "Eliminar paquetes");

            basePermisos.put("consolidados.read", "Ver consolidados");
            basePermisos.put("consolidados.create", "Crear consolidados");
            basePermisos.put("consolidados.add_paquete", "Agregar paquetes a consolidados");
            basePermisos.put("consolidados.cerrar", "Cerrar consolidados");
            basePermisos.put("consolidados.delete", "Eliminar consolidados");

            basePermisos.put("shippers.read", "Ver shippers");
            basePermisos.put("shippers.create", "Crear shippers");
            basePermisos.put("shippers.update", "Actualizar shippers (datos, teléfonos, direcciones)");
            basePermisos.put("shippers.delete", "Eliminar shippers");
            basePermisos.put("shippers.aprobar", "Aprobar/rechazar solicitudes de registro de shippers");

            for (var e : basePermisos.entrySet()) {
                if (permisoRepository.findByNombre(e.getKey()).isEmpty()) {
                    Permiso p = new Permiso();
                    p.setNombre(e.getKey());
                    p.setDescripcion(e.getValue());
                    permisoRepository.save(p);
                }
            }

            // 2) Roles base (canónicos: ADMIN, OPERARIO, SHIPPER).
            Rol adminRole = rolRepository.findByNombre("ADMIN").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("ADMIN");
                return rolRepository.save(r);
            });

            Rol operarioRole = rolRepository.findByNombre("OPERARIO").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("OPERARIO");
                return rolRepository.save(r);
            });

            Rol shipperRole = rolRepository.findByNombre("SHIPPER").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("SHIPPER");
                return rolRepository.save(r);
            });

            // 3) Asignación de permisos por rol.
            // ADMIN: todos los permisos disponibles en el sistema.
            adminRole.setPermisos(new LinkedHashSet<>(permisoRepository.findAll()));
            rolRepository.save(adminRole);

            // OPERARIO: gestión completa de paquetes, consolidados y shippers.
            operarioRole.setPermisos(resolvePermisos(List.of(
                    "paquetes.read", "paquetes.create_minimo", "paquetes.update", "paquetes.delete",
                    "consolidados.read", "consolidados.create", "consolidados.add_paquete",
                    "consolidados.cerrar", "consolidados.delete",
                    "shippers.read", "shippers.create", "shippers.update", "shippers.delete",
                    "shippers.aprobar"
            )));
            rolRepository.save(operarioRole);

            // SHIPPER: solo gestión de sus propios paquetes (filtro por shipperId en controllers).
            shipperRole.setPermisos(resolvePermisos(List.of(
                    "paquetes.read",
                    "paquetes.create_minimo",
                    "paquetes.update"
            )));
            rolRepository.save(shipperRole);

            // 4) Usuario ADMIN por defecto (con autocorrección de contraseña en dev).
            if (usuarioRepository.findByUsername("admin").isEmpty()) {
                Usuario admin = new Usuario();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setEmail("admin@ecubox.com");
                admin.setRol(adminRole);
                admin.setActivo(true);
                usuarioRepository.save(admin);
                System.out.println("Usuario ADMIN creado: admin / admin123");
            } else {
                usuarioRepository.findByUsername("admin").ifPresent(admin -> {
                    boolean matches = passwordEncoder.matches("admin123", admin.getPassword());
                    if (!matches) {
                        admin.setPassword(passwordEncoder.encode("admin123"));
                        admin.setActivo(true);
                        if (admin.getRol() == null) {
                            admin.setRol(adminRole);
                        }
                        usuarioRepository.save(admin);
                        System.out.println("Usuario ADMIN actualizado: admin / admin123");
                    }
                });
            }

            // 5) Usuario OPERARIO por defecto (solo en bootstrap inicial).
            if (usuarioRepository.findByUsername("operario").isEmpty()) {
                Usuario operario = new Usuario();
                operario.setUsername("operario");
                operario.setPassword(passwordEncoder.encode("operario123"));
                operario.setEmail("operario@ecubox.com");
                operario.setRol(operarioRole);
                operario.setActivo(true);
                usuarioRepository.save(operario);
                System.out.println("Usuario OPERARIO creado: operario / operario123");
            }
        };
    }

    private Set<Permiso> resolvePermisos(List<String> nombres) {
        Set<Permiso> result = new LinkedHashSet<>();
        for (String nombre : nombres) {
            permisoRepository.findByNombre(nombre).ifPresent(result::add);
        }
        return result;
    }
}
