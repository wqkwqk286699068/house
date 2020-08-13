package com.house.service.impl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.house.common.page.ColumnFilter;
import com.house.common.page.MybatisPageHelper;
import com.house.common.page.PageRequest;
import com.house.common.page.PageResult;
import com.house.dao.SysLogMapper;
import com.house.model.SysLog;
import com.house.service.SysLogService;

@Service
public class SysLogServiceImpl implements SysLogService {

	@Autowired
	private SysLogMapper sysLogMapper;

	@Override
	public int save(SysLog record) {
		if (record.getId() == null || record.getId() == 0) {
			return sysLogMapper.insertSelective(record);
		}
		return sysLogMapper.updateByPrimaryKeySelective(record);
	}

	@Override
	public int delete(SysLog record) {
		return sysLogMapper.deleteByPrimaryKey(record.getId());
	}

	@Override
	public int delete(List<SysLog> records) {
		for (SysLog record : records) {
			delete(record);
		}
		return 1;
	}

	@Override
	public SysLog findById(Long id) {
		return sysLogMapper.selectByPrimaryKey(id);
	}

	@Override
	public PageResult findPage(PageRequest pageRequest) {
		ColumnFilter columnFilter = pageRequest.getColumnFilter("userName");
		if (columnFilter != null) {
			return MybatisPageHelper.findPage(pageRequest, sysLogMapper, "findPageByUserName", columnFilter.getValue());
		}
		return MybatisPageHelper.findPage(pageRequest, sysLogMapper);
	}

}
