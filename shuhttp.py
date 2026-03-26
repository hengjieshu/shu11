import requests
import re

def main(统计时间原始, 净支付金额原始, 表格名称="实时销售"):
    """
    影刀调用模块入口函数
    参数：
        统计时间原始: 时间字符串，如 "2026-03-26 12:12:41"
        净支付金额原始: 金额字符串（可能包含多余信息）
        表格名称: 目标表格名称，默认为"实时销售"
    """

    # 调试输出：查看实际接收到的值
    print(f"【调试】接收到的原始值:")
    print(f"  统计时间原始: {repr(统计时间原始)}")
    print(f"  净支付金额原始: {repr(净支付金额原始)}")
    print(f"  表格名称: {repr(表格名称)}")

    # ========== 数据清洗 ==========

    # 时间格式转换
    # 处理可能的变量名传入情况
    if isinstance(统计时间原始, str):
        if "统计时间" in 统计时间原始 and len(统计时间原始) > 20:
            # 如果传入的是带变量名的字符串，尝试提取时间部分
            time_match = re.search(r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})', 统计时间原始)
            if time_match:
                统计时间 = time_match.group(1).replace(" ", "T")[:16]
            else:
                统计时间 = str(统计时间原始).replace(" ", "T")[:16]
        else:
            统计时间 = str(统计时间原始).replace(" ", "T")[:16]
    else:
        统计时间 = str(统计时间原始).replace(" ", "T")[:16]

    # 金额提取
    amount_str = str(净支付金额原始)
    print(f"【调试】金额字符串: {repr(amount_str)}")

    # 提取第一行的数字（支持千分位逗号）
    first_line = amount_str.split('\n')[0].strip()
    金额匹配 = re.search(r'[\d,]+\.?\d*', first_line)

    if 金额匹配:
        净支付金额 = float(金额匹配.group().replace(',', ''))
        print(f"【调试】匹配到金额: {净支付金额}")
    else:
        净支付金额 = 0.0
        print(f"【调试】未匹配到金额，设为0.0")

    print(f"【调试】清洗后数据:")
    print(f"  统计时间: {统计时间}")
    print(f"  净支付金额: {净支付金额}")

    # ========== 发送HTTP请求 ==========

    api_url = "http://shu11.top:180/api/yingdao/sale"

    data = {
        "tableName": str(表格名称),
        "统计时间": 统计时间,
        "净支付金额": 净支付金额
    }

    print(f"【调试】发送数据: {data}")

    try:
        response = requests.post(api_url, json=data, timeout=10)
        result = response.json()
        print(f"【调试】API返回: {result}")

        # 返回结果给影刀
        if result.get("success"):
            return {
                "success": True,
                "rowId": result['rowId'],
                "message": "数据添加成功",
                "清洗后时间": 统计时间,
                "清洗后金额": 净支付金额
            }
        else:
            return {
                "success": False,
                "error": result.get('error'),
                "清洗后时间": 统计时间,
                "清洗后金额": 净支付金额
            }

    except Exception as e:
        print(f"【调试】请求异常: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "清洗后时间": 统计时间,
            "清洗后金额": 净支付金额
        }