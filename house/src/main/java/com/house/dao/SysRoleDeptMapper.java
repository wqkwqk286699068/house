package com.house.dao;

import org.apache.ibatis.annotations.Mapper;

import com.house.model.SysRoleDept;
@Mapper
public interface SysRoleDeptMapper {
	int deleteByPrimaryKey(Long id);

	int insert(SysRoleDept record);

	int insertSelective(SysRoleDept record);

	SysRoleDept selectByPrimaryKey(Long id);

	int updateByPrimaryKeySelective(SysRoleDept record);

	int updateByPrimaryKey(SysRoleDept record);
}