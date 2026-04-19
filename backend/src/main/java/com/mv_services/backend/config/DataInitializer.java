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

            basePermisos.put("shippers.aprobar", "Aprobar/rechazar solicitudes de registro de shippers");

            for (var e : basePermisos.entrySet()) {
                if (permisoRepository.findByNombre(e.getKey()).isEmpty()) {
                    Permiso p = new Permiso();
                    p.setNombre(e.getKey());
                    p.setDescripcion(e.getValue());
                    permisoRepository.save(p);
                }
            }

            // 2) Roles base
            Rol adminRole = rolRepository.findByNombre("ADMIN").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("ADMIN");
                return rolRepository.save(r);
            });

            Rol shipperRole = rolRepository.findByNombre("SHIPPER").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("SHIPPER");
                return rolRepository.save(r);
            });

            Rol mvAdminRole = rolRepository.findByNombre("MV_ADMIN").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("MV_ADMIN");
                return rolRepository.save(r);
            });

            Rol operarioRole = rolRepository.findByNombre("OPERARIO").orElseGet(() -> {
                Rol r = new Rol();
                r.setNombre("OPERARIO");
                return rolRepository.save(r);
            });

            // 3) Asignación de permisos por rol
            Set<Permiso> allPermisos = new LinkedHashSet<>(permisoRepository.findAll());
            adminRole.setPermisos(allPermisos);
            rolRepository.save(adminRole);

            Set<Permiso> shipperPermisos = new LinkedHashSet<>();
            permisoRepository.findByNombre("paquetes.read").ifPresent(shipperPermisos::add);
            permisoRepository.findByNombre("paquetes.create_minimo").ifPresent(shipperPermisos::add);
            shipperRole.setPermisos(shipperPermisos);
            rolRepository.save(shipperRole);

            Set<Permiso> mvAdminPermisos = new LinkedHashSet<>();
            // Paquetes
            permisoRepository.findByNombre("paquetes.read").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("paquetes.create_minimo").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("paquetes.update").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("paquetes.delete").ifPresent(mvAdminPermisos::add);
            // Consolidados
            permisoRepository.findByNombre("consolidados.read").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("consolidados.create").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("consolidados.add_paquete").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("consolidados.cerrar").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("consolidados.delete").ifPresent(mvAdminPermisos::add);
            permisoRepository.findByNombre("shippers.aprobar").ifPresent(mvAdminPermisos::add);
            mvAdminRole.setPermisos(mvAdminPermisos);
            rolRepository.save(mvAdminRole);

            // OPERARIO: paquetes.read, paquetes.update, paquetes.create_minimo, consolidados.read, consolidados.add_paquete, consolidados.cerrar
            Set<Permiso> operarioPermisos = new LinkedHashSet<>();
            permisoRepository.findByNombre("paquetes.read").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("paquetes.update").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("paquetes.create_minimo").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("consolidados.read").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("consolidados.add_paquete").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("consolidados.cerrar").ifPresent(operarioPermisos::add);
            permisoRepository.findByNombre("shippers.aprobar").ifPresent(operarioPermisos::add);
            operarioRole.setPermisos(operarioPermisos);
            rolRepository.save(operarioRole);

            // Create User ADMIN if not exists
            if (usuarioRepository.findByUsername("admin").isEmpty()) {
                Usuario admin = new Usuario();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123")); // Default password
                admin.setEmail("admin@ecubox.com");
                admin.setRol(adminRole);
                admin.setActivo(true);
                usuarioRepository.save(admin);
                System.out.println("Usuario ADMIN creado: admin / admin123");
            } else {
                // Keep local/dev admin credentials aligned with documented defaults.
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

            // Create User OPERARIO if not exists
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
}
