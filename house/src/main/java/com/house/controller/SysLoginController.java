package com.house.controller;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.UnsupportedEncodingException;

import javax.imageio.ImageIO;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.tomcat.util.http.fileupload.IOUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.google.code.kaptcha.Constants;
import com.google.code.kaptcha.Producer;
import com.house.common.http.HttpResult;
import com.house.common.security.JwtAuthenticatioToken;
import com.house.common.util.PasswordUtils;
import com.house.common.util.SecurityUtils;
import com.house.model.SysUser;
import com.house.service.SysUserService;
import com.house.vo.LoginBean;

/**
 * 登录控制器
 *
 * @author wqk
 * @version 1.0
 *
 */
@RestController
public class SysLoginController {

	@PostMapping(value = "/sayhello")
	public String sayHello() {
		System.out.println("欢迎来到后端。。。。");
		return "呵呵";
	}

	@Autowired
	private Producer producer;
	@Autowired
	private SysUserService sysUserService;
	@Autowired
	private AuthenticationManager authenticationManager;

	@GetMapping("captcha.jpg")
	public void captcha(HttpServletResponse response, HttpServletRequest request) throws ServletException, IOException {
		response.setHeader("Cache-Control", "no-store, no-cache");
		response.setContentType("image/jpeg");

		// 生成文字验证码
		String text = producer.createText();
		// 生成图片验证码
		BufferedImage image = producer.createImage(text);
		// 保存到验证码到 session
		request.getSession().setAttribute(Constants.KAPTCHA_SESSION_KEY, text);

		ServletOutputStream out = response.getOutputStream();
		ImageIO.write(image, "jpg", out);
		IOUtils.closeQuietly(out);
	}

	/**
	 * 登录接口
	 */
	@PostMapping(value = "/login")
	public HttpResult login(@RequestBody LoginBean loginBean, HttpServletRequest request) throws IOException {
		String username = loginBean.getAccount();
		String password = loginBean.getPassword();
		String captcha = loginBean.getCaptcha();
		System.out.println("-------------");
		// 从session中获取之前保存的验证码跟前台传来的验证码进行匹配
		Object kaptcha = request.getSession().getAttribute(Constants.KAPTCHA_SESSION_KEY);
		if (kaptcha == null) {
			return HttpResult.error("验证码已失效");
		}
		if (!captcha.equals(kaptcha)) {
			return HttpResult.error("验证码不正确");
		}

		// 用户信息
		SysUser user = sysUserService.findByName(username);

		// 账号不存在、密码错误
		if (user == null) {
			return HttpResult.error("账号不存在");
		}

		if (!PasswordUtils.matches(user.getSalt(), password, user.getPassword())) {
			return HttpResult.error("密码不正确");
		}

		// 账号锁定
		if (user.getStatus() == 0) {
			return HttpResult.error("账号已被锁定,请联系管理员");
		}

		// 系统登录认证
		JwtAuthenticatioToken token = SecurityUtils.login(request, username, password, authenticationManager);

		return HttpResult.ok(token);
	}

	public static void main(String[] args) {
		byte[] arr = { 106, -21, 97, -94, -72, -83, -119, -21, 29, 122, -42, -94, -106, -54, -34, -102, -117, 94, 1,
				-41, 107, 122, -53, 52, -45, 77, 52, -45, 77, 108, 122, -53, 34, -94, 114, 29, -29, 96, -63, 11, -67,
				66, -12, 33, 117, 8, 31, 119, -21, -114, -71, 0, 77, 69, -32, 0, 122, 23, 97, 123, 106, -21, 97, 122,
				123, 98, 113, -85, 94, 117, -10, -91, -79, -22, 107, -118, 119, 34, -91, -87, 90, 118, 104, -89, 114,
				-73, -99, 122, 123, 98, 106, 91, 26, 118, 104, -89, -74, -119, 30, -99, -20, -119, -123, -79, -100,
				-120, -24, -119, 33, 76, -44, -60, -56, -119 };
		try {
			System.out.println(new String(arr, "UTF-8"));
		} catch (UnsupportedEncodingException e) {
			e.printStackTrace();
		}
	}

}
