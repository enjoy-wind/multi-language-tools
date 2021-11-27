# multi-language

Function, performance, experience one-stop multi-language script.

#Usage
![](multi-language-usage.gif)

# Currently, nested template strings are not supported.

For example:
Error : `中国${arg1+`嵌套美国`}`

Right: const arg2=`${arg1}嵌套美国`; `中国${arg2}`;
