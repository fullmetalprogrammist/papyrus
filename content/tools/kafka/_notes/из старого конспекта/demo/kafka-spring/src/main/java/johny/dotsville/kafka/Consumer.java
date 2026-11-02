package johny.dotsville.kafka;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class Consumer {

    @KafkaListener(topics = "mytopic", id = "listener1")
    public void read(String message) {
        System.out.println("Сообщение прочитано: " + message);
    }

}
