package com.mv_services.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "roles")
public class Rol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nombre;

    @Builder.Default
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "roles_permisos", joinColumns = @JoinColumn(name = "rol_id", referencedColumnName = "id"), inverseJoinColumns = @JoinColumn(name = "permiso_id", referencedColumnName = "id"))
    private Set<Permiso> permisos = new HashSet<>();
}
