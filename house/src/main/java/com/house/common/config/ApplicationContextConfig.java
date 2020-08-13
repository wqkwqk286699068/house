package com.house.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * 容器上下文
 * 
 * @author wqk
 * @version 1.0
 *
 */
@Component
public class ApplicationContextConfig implements ApplicationContextAware {
	private static Logger logger = LoggerFactory.getLogger(ApplicationContextConfig.class);

	private static ApplicationContext APPLICATION_CONTEXT;

	/**
	 * 设置spring上下文
	 * 
	 * @param applicationContext spring上下文
	 * @throws BeansException
	 */
	@Override
	public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
		logger.debug("ApplicationContext registed-->{}", applicationContext);
		APPLICATION_CONTEXT = applicationContext;
	}

	/**
	 * 获取容器
	 * 
	 * @return
	 */
	public static ApplicationContext getApplicationContext() {
		return APPLICATION_CONTEXT;
	}

	/**
	 * 获取容器对象
	 * 
	 * @param type
	 * @param <T>
	 * @return
	 */
	public static <T> T getBean(Class<T> type) {
		return APPLICATION_CONTEXT.getBean(type);
	}
}
