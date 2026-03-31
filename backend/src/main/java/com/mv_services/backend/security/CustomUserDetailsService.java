package com.mv_services.backend.security;

import com.mv_services.backend.model.Usuario;
import com.mv_services.backend.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    public CustomUserDetailsService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + username));

        List<SimpleGrantedAuthority> authorities = new ArrayList<>();

        if (usuario.getRol() != null && usuario.getRol().getNombre() != null && !usuario.getRol().getNombre().isBlank()) {
            // Soporta hasRole('ADMIN') / hasAnyRole(...); normalizar a mayúsculas para coincidir con @PreAuthorize
            String roleName = usuario.getRol().getNombre().trim().toUpperCase();
            authorities.add(new SimpleGrantedAuthority("ROLE_" + roleName));

            if (usuario.getRol().getPermisos() != null) {
                // Soporta hasAuthority('consolidados.cerrar') etc.
                usuario.getRol().getPermisos().forEach(p -> {
                    if (p != null && p.getNombre() != null && !p.getNombre().isBlank()) {
                        authorities.add(new SimpleGrantedAuthority(p.getNombre().trim()));
                    }
                });
            }
        }

        return new User(usuario.getUsername(), usuario.getPassword(), authorities);
    }
}
