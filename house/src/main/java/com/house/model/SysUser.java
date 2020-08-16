package com.house.model;

import java.util.ArrayList;
import java.util.List;

/**
 * 用户实体
 * 
 * @author wqk
 * @version 1.0
 *
 */
public class SysUser extends BaseModel {

	private int house_id;

	private String name;

	private String password;

	private String salt;

	private String email;

	private String mobile;

	private Byte status;

	private Long deptId;

	private String deptName;

	private Byte delFlag;

	private String roleNames;

	/**
	 * 房源
	 */
	private String houseSource;
	/**
	 * 房源地址
	 */
	private String houseAddress;

	private List<SysUserRole> userRoles = new ArrayList<>();

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	public String getSalt() {
		return salt;
	}

	public void setSalt(String salt) {
		this.salt = salt;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getMobile() {
		return mobile;
	}

	public void setMobile(String mobile) {
		this.mobile = mobile;
	}

	public Byte getStatus() {
		return status;
	}

	public void setStatus(Byte status) {
		this.status = status;
	}

	public Long getDeptId() {
		return deptId;
	}

	public void setDeptId(Long deptId) {
		this.deptId = deptId;
	}

	public String getDeptName() {
		return deptName;
	}

	public void setDeptName(String deptName) {
		this.deptName = deptName;
	}

	public Byte getDelFlag() {
		return delFlag;
	}

	public void setDelFlag(Byte delFlag) {
		this.delFlag = delFlag;
	}

	public String getRoleNames() {
		return roleNames;
	}

	public void setRoleNames(String roleNames) {
		this.roleNames = roleNames;
	}

	public List<SysUserRole> getUserRoles() {
		return userRoles;
	}

	public void setUserRoles(List<SysUserRole> userRoles) {
		this.userRoles = userRoles;
	}

	public String getHouseSource() {
		return houseSource;
	}

	public void setHouseSource(String houseSource) {
		this.houseSource = houseSource;
	}

	public String getHouseAddress() {
		return houseAddress;
	}

	public void setHouseAddress(String houseAddress) {
		this.houseAddress = houseAddress;
	}

	public int getHouse_id() {
		return house_id;
	}

	public void setHouse_id(int house_id) {
		this.house_id = house_id;
	}

}