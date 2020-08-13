package com.house.dao;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.house.model.SysDept;

/**
 * 机构dao
 * 
 * @author wqk
 * @version 1.0
 *
 */
@Mapper
public interface SysDeptMapper {
	int deleteByPrimaryKey(Long id);

	int insert(SysDept record);

	int insertSelective(SysDept record);

	SysDept selectByPrimaryKey(Long id);

	int updateByPrimaryKeySelective(SysDept record);

	int updateByPrimaryKey(SysDept record);

	List<SysDept> findPage();

	List<SysDept> findAll();
}