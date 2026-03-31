package backend.food_lable_analysis.service;

import java.util.Collections;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import backend.food_lable_analysis.repository.IUserRepo;
import backend.food_lable_analysis.model.User;

@Service
public class UserService implements UserDetailsService {

    @Autowired
    private IUserRepo userRepository;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail)
            throws UsernameNotFoundException {

        User user = userRepository.findByUsername(usernameOrEmail)
                .or(() -> userRepository.findByGmail(usernameOrEmail))
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // Always return actual username stored in DB
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .authorities(Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + normalizeRole(user.getRole()))
                ))
                .build();
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "USER";
        }
        return role.trim().toUpperCase();
    }
}
