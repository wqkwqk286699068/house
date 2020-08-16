package com.house.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.house.model.SysUser;

@Mapper
public interface SysUserMapper {
	int deleteByPrimaryKey(Long id);

	/**
	 * 删除房源
	 * 
	 * @param id
	 * @return
	 */
	int deleteHouseSource(Long id);

	int insert(SysUser record);

	int insertSelective(SysUser record);

	/**
	 * 添加房源
	 * 
	 * @param record
	 * @return
	 */
	int insertHouseSource(SysUser record);

	SysUser selectByPrimaryKey(Long id);

	int updateByPrimaryKeySelective(SysUser record);

	int updateByPrimaryKey(SysUser record);

	List<SysUser> findPage();

	SysUser findByName(@Param(value = "name") String name);

	List<SysUser> findPageByName(@Param(value = "name") String name);

	List<SysUser> findPageByNameAndEmail(@Param(value = "name") String name, @Param(value = "email") String email);
}