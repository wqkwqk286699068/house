package com.house;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 程序入口
 * 
 * @author msi
 *
 */
@SpringBootApplication
@MapperScan("com.house.*.dao")
public class App {
	public static void main(String[] args) {
		SpringApplication.run(App.class);
	}
}
