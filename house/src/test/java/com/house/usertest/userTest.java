package com.house.usertest;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit4.SpringRunner;

import com.house.dao.SysUserMapper;
import com.house.model.SysUser;

/**
 * user单元测试
 * 
 * @author wqk
 *
 */
@SpringBootTest
@RunWith(SpringRunner.class)
public class userTest {

	@Autowired
	SysUserMapper sysUserMapper;

	@Test
	public void test() {
		SysUser user = new SysUser();
	}

}
