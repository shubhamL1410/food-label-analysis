package backend.food_lable_analysis.repository;


import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

import backend.food_lable_analysis.model.User;


public interface IUserRepo extends MongoRepository<User, String> {

    Optional<User> findByUsername(String username);
    
    Optional<User> findByGmail(String username);

}
