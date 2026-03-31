package backend.food_lable_analysis.repository;

import backend.food_lable_analysis.model.OtpVerification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface OtpRepository extends MongoRepository<OtpVerification, String> {

    Optional<OtpVerification> findByEmail(String email);

    void deleteByEmail(String email);
}
