package johny.dotsville.kafka;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

@SpringBootApplication
public class App {

	public static void main(String[] args) {
		ApplicationContext context = SpringApplication.run(App.class, args);

		Producer helper = (Producer) context.getBean("producer");
		String topic = "mytopic";
		String message = "Hello, kafka!";
		helper.send(topic, message);
	}

}
