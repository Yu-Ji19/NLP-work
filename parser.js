var _ = require('lodash');


var member_flag = 0;
var name_Count = {};  //name --> Count object
var name_times = {
};	 //name --> times appeared
var name_times_temp = {
	regular:{},
	while:{},
	for:{},
};
var name_functionCall = {};  //name --> function invoked
var name_para = {};

var variable_used_in_if = [];
var accumulator = [];
var dest = [];
var variables = [];
var alerts=[];
var function_declared=[];

var custom_function_para = [];
var library_para = [];
var initial_function_call = [];
var math_temp = [];

var string_logical = false;
var if_flag = false;
var custom_function_flag = false;
var library_flag = false;
var for_flag = false;
var while_flag = false;




function accumulator_check(expression, name){
	switch(expression.type){
		case 'Literal':{
			if(expression.value == name){
				return (typeof name) == 'number'
			}
		}
		case 'Identifier':{
			if(expression.name == name){
				return (typeof name) == 'string';
			}
			return false;
		}
		case 'BinaryExpression':{
			return (accumulator_check(expression.left, name) || accumulator_check(expression.right, name));
		}
		case 'LogicalExpression':{
			return (accumulator_check(expression.left, name) || accumulator_check(expression.right, name));
		}
	}
	return false;
}

function update_check(expression){
	if((expression.operator == "+=") && (expression.right!= undefined) && (expression.right.value == 1)){
		return true;
	}
	if((expression.operator == "-=") && (expression.right!= undefined) && (expression.right.value == 1)){
		return true;
	}
	if((expression.right.operator == "+" || expression.right.operator == "-" ) && accumulator_check(expression, expression.left.name) && accumulator_check(expression, 1)){
		return true;
	}
}



function add_name_times(obj, name){
	if(obj[name]==undefined){
		obj[name]=1;	
	}
	else{
		obj[name]++;	
	}
	return obj;
}






//*****************************************************************************************//
//************************************   Large Block Parse  *******************************//
//*****************************************************************************************//


function parseExpression(expression){
	var count = new Count();
	if(expression!=undefined){
		switch(expression.type){
			case 'Identifier':{
				if(variables.includes(expression.name)){
					variables.splice(variables.indexOf(expression.name),1);
				}
				if(if_flag){
					if(!variable_used_in_if.includes(expression.name)){
						variable_used_in_if.push(expression.name);	
					}	
				}
				if(custom_function_flag){
					if(!custom_function_para.includes()){
						custom_function_para.push(expression.name);
					}
				}
				if(library_flag){
					if(!library_para.includes(expression.name)){
						library_para.push(expression.name);
					}	
				}
				break;
			}
			case 'AssignmentExpression':{
				if(expression.operator!='='){
					count.update_count++;
				}
				var name = expression.left.name;
				switch(expression.right.type){
					case 'FunctionExpression':{
						var composite = parseBlockStatement(expression.right.body);
						name_Count[name] = composite;
						break;
					}
					case 'Identifier':{
						var index = expression.right.name;
						if(function_declared.includes(index)){	//declared function
							name_Count[name] = name_Count[index];
							function_declared.push(name);   //can partly solve the problem, but won't work if the initial assignment comes later
						}
						/* else{  what if (b = function a) and then c = b? }  problem: function declared won't include b
						*/
						break;
					}
					case "BinaryExpression":{
						count.increment(parseExpression(expression.left));
						count.increment(parseExpression(expression.right));
						break;
					}
					default:{
						count.increment(parseExpression(expression.right));
					}
				}
				if(update_check(expression)){
					count.update_count++;
				}
				else if(accumulator.includes(name) && (expression.operator != "=" || accumulator_check(expression.right, name))){
					count.accum_pattern ++;
				}
				break;
			}
			case 'UpdateExpression':{
				count.update_count++;
				break;
			}
			case 'CallExpression':{
				//get the function
				var type = expression.callee.type;
				var name = expression.callee.name;
				var custom_temp = custom_function_flag;
				var library_temp = library_flag;
				if(name=='alert'){ 
					count.alert_count++;
					parseAlert(expression);
				}
				if(name=='prompt'){
					count.prompt_count++;
				}
				if(type == 'MemberExpression'){ //object.function()
					member_flag=1;
					// console.log(expression.callee)
					if(expression.callee.object.name == "Math"){
						if(!math_temp.includes(expression.callee.property.name)){
							math_temp.push(expression.callee.property.name);
						}
					}
					count.increment(parseExpression(expression.callee));
				}
				else if(type == 'Identifier'){ // function()
					if(while_flag){
						name_times_temp.while = add_name_times(name_times_temp.while, name);
					}
					else if(for_flag){
						name_times_temp.for = add_name_times(name_times_temp.for, name);
					}
					else{
						name_times_temp.regular = add_name_times(name_times_temp.regular, name);
					}
					dest.push(name);
					if(function_declared.includes(name)){
						custom_function_flag = true;
						library_flag = false;
					}
					else{
						custom_function_flag = false;
						library_flag=true;
					}
				}

				for(var index in expression.arguments){
					count.increment(parseExpression(expression.arguments[index]));
				}
				custom_function_flag=custom_temp;
				library_flag = library_temp;
				break;
			}
			case 'MemberExpression':{
				count.increment(parseExpression(expression.object));
				count.increment(parseExpression(expression.property));
				if(member_flag==0){
					count.property_acc++;
				}
				member_flag=0; //function call
				break;
			}
			case 'FunctionExpression':{
				var composite = parseBlockStatement(expression.body);
				break;
			}
			case 'BinaryExpression':{
				if(expression.operator == "%"){
					count.modulo++;
				}
				if(expression.operator == "*"){
					count.multiplication++;
				}
				if(expression.operator == "/"){
					count.division++;
				}
				count.increment(parseExpression(expression.left));
				count.increment(parseExpression(expression.right));
				//capture the range
				break;
			}
			case 'LogicalExpression':{
				if((typeof expression.left.value=="string")&&(typeof expression.left.value=="string")){
					string_logical = true;
				}
				count.increment(parseExpression(expression.left));
				count.increment(parseExpression(expression.right));
				break;
			}
			case 'UnaryExpression':{
				count.increment(parseExpression(expression.argument));
				break;
			}
		}
	}

	return count;
}






function parseStatement(statement){
	var composite = new Composite();
	if(statement!=null){
		switch(statement.type){
			case 'BlockStatement':{
				var obj = parseBlockStatement(statement);
				composite.increment(obj);
				break;
			}
			case 'VariableDeclaration':{
				composite.count.increment(parseVarDec(statement)); 
			}
			case 'ExpressionStatement':{
				composite.count.increment(parseExpression(statement.expression));
				break;
			}
			case 'IfStatement':{
				if_flag = true;
				composite.count.increment(parseExpression(statement.test));
				if_flag = false;
				composite.increment(parseStatement(statement.consequent).multiple(0.5));
				composite.increment(parseStatement(statement.alternate).multiple(0.5));
				// count.if_count++;
				break;
			}
			case 'ForStatement':{
				composite.count.for_count++;
				for_flag = true;
				composite.count.increment(parseExpression(statement.test));
				var obj = parseStatement(statement.body);
				for_flag = false;
				composite.for_Count.increment(obj.for_Count);
				composite.while_Count.increment(obj.while_Count)
				composite.for_Count.increment(obj.count);
				composite.count.while_count+=obj.count.while_count;
				composite.count.for_count+=obj.count.for_count;
				break;
			}
			case 'ForInStatement':{

				composite.count.increment(parseExpression(statement.left));
				composite.count.increment(parseExpression(statement.right));
				composite.increment(parseStatement(statement.body));
				break;
			}
			case 'FunctionDeclaration':{
				var obj = parseBlockStatement(statement.body);
				var name = statement.id.name;   //assume function id is not null
				name_Count[name] = obj;
				name_times[name] = name_times_temp;
				name_times_temp = {	
					regular:{},
					while:{},
					for:{},
				};
				break;
			}
			case 'WhileStatement':{
				while_flag = true;
				composite.while_Count.increment(parseExpression(statement.test).while_Count);
				var obj = parseStatement(statement.body);
				while_flag = false;
				composite.while_Count.increment(obj.while_Count);
				composite.for_Count.increment(obj.for_Count);
				composite.while_Count.increment(obj.count);
				composite.count.while_count+=obj.count.while_count;
				composite.count.for_count+=obj.count.for_count;
				//要不要系数？
				composite.count.while_count++;
				break;
			}
			case "ReturnStatement":{
				composite.count.increment(parseExpression(statement.argument));
				break;
			}
			case "ContinueStatement":{
				composite.count.continue_count++;
				break;
			}
			case "BreakStatement":{
				composite.count.break_count++;
				break;
			}
		}
	}
	return composite;
}


function parseBlockStatement(block){
	var composite = new Composite();
	for(var index in block.body){
    	let statement = block.body[index];
    	var obj = parseStatement(statement);
    	composite.increment(obj);
    }
    return composite;
}







//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//*****************************************************************************************//
//**************************   The Only Obvious Code from Outside  ************************//
//*****************************************************************************************//
// - Input : the ast, function_declared
/* - Ouptut: an object{
				name_Count: {function name --> Count}
				name_functionCall: {function name --> [invoked function names]}

			}
*/


function parseAST(contents, new_function_declared){
	initialization();
	function_declared = new_function_declared;
	for(var index in contents.body){
		dest = [];
		library_para = [];
		custom_function_para = [];
		variable_used_in_if = [];
    	var statement = contents.body[index];
    	if(statement.type=="ExpressionStatement"&&statement.expression.type == "CallExpression"){
    		initial_function_call.push(statement.expression.callee.name);
    	}
    	parseStatement(statement); // all function count are stored in name_Count;
    	if(statement.type == "FunctionDeclaration"){
       		name_functionCall[statement.id.name] = dest;
       		name_Count[statement.id.name].library_parameter = library_para;
       		name_Count[statement.id.name].custom_parameter = custom_function_para;
			name_Count[statement.id.name].variable_used_in_if = variable_used_in_if;
       }
    }
    var collapsed_count = {};
    for(var i = 0;i<Object.keys(name_Count).length; i++){
    	var name = Object.keys(name_Count)[i];
    	collapsed_count[name] = absorb(name_Count[name].count, name_Count[name].while_Count,name_Count[name].for_Count);
    }
    // console.log(name_Count)
  	return {
  		name_Count: name_Count,
  		name_invoked_function: name_functionCall,
  		string_logical: string_logical,
  		alerts: alerts,
  		name_times: name_times,
  		initial_function_call: initial_function_call,
  		collapsed_count:collapsed_count,
  		math: math_temp,
  	}
}
















//*****************************************************************************************//
//***********************************Parse Variable Declaration****************************//
//*****************************************************************************************//








function parseVarDec(statement){
	var count = new Count();
	if(statement.kind=='let'){	//may be removed if let will never be used
		variables.push(statement.declarations[0].id.name);
		count.let_dec++;
	}
	if(statement.kind=='var'){
		variables.push(statement.declarations[0].id.name);
		// count.var_dec++;
	}
	if((!while_flag) && (!for_flag)){
		accumulator.push(statement.declarations[0].id.name);
	}
	for(var index in statement.declarations){
		let declaration = statement.declarations[index];
		var init_count = parseExpression(declaration.init);
		
		if(declaration.init!=undefined){
			if(declaration.init.value == 0){
				count.zero_init++;
			}	
			if(declaration.init.type=='FunctionExpression'){
				var name = declaration.id.name;
				name_Count[name] = init_count;	
			}
			else if(declaration.init.type=='Identifier'){
				var key = declaration.id.name;
				var index = declaration.init.name;
				if(function_declared.includes(index)){
					name_Count[key] = name_Count[index];//previously defined, put count as value
					function_declared.push(name);
				}
			}
			else{
				count.increment(init_count);
			}
		}
	}
	
	return count;	
}






//*****************************************************************************************//
//*****************************Parse for Literals in students' output**********************//
//*****************************************************************************************//


function parseAlert(expression){
	for(var index in expression.arguments){
		var string = parseOutputExpression(expression.arguments[index]);
		if((string.length>0) && (!alerts.includes(string))){
			alerts.push(string);
		}
	}
}

function parseOutputExpression(expression){
	switch(expression.type){
		case 'Literal':{
			return expression.value;
		}
		case 'BinaryExpression':{
			if(expression.operator=='+'){
				return parseOutputExpression(expression.left) + parseOutputExpression(expression.right);				
			}
		}
	}
	return "";
}






//*****************************************************************************************//
//**************************************   Count Class ************************************//
//*****************************************************************************************//

function absorb(count, w, f){
	var temp = new Count().increment(count);
	for(var i in w){
		temp[i] += w[i];
		temp[i] += f[i];
	}
	return temp;
}

class Composite{
	constructor(){
		this.count = new Count();
		this.while_Count = new Count();
		this.for_Count = new Count();
	}

	increment(obj){
		this.count.increment(obj.count);
		this.while_Count.increment(obj.while_Count);
		this.for_Count.increment(obj.for_Count);
	}

	multiple(times){
		for(var k in this){
			this[k].multiple(times);
		}
		return this;
	}
}

class Count {
	constructor(){
		this.path = "";
		this.let_dec = 0;
		this.while_count = 0;
		this.for_count=0;
		this.update_count = 0;
		this.property_acc = 0;
		this.continue_count = 0;
		this.break_count = 0;
		this.prompt_count=0;
		this.alert_count=0;
		this.zero_init = 0;
		this.modulo = 0;
		this.accum_pattern = 0;
		this.multiplication = 0;
		this.division = 0;
		this.math_function = 0;
	}

	increment(object){
		if(!(object instanceof Count)){
			return null;
		}
		for(var k in object){
			this[k]+=object[k];
		}
		return this;
	}

	multiple(times){
		for(var k in this){
			this[k]=this[k]*times;
		}
		return this;
	}
}





function initialization(){
	member_flag = 0;
	name_Count = {};  //name --> Count object
	name_times = {};	 //name --> times appeared
	name_times_temp = {
		regular:{},
		while:{},
		for:{},
	};
	name_functionCall = {};  //name --> function invoked
	variable_used_in_if = [];
	dest = [];
	variables = [];
	alerts=[];
	function_declared=[];
	custom_function_para = [];
	library_para = [];
	initial_function_call = [];
	string_logical = false;
	if_flag = false;
	custom_function_flag = false;
	library_flag = false;
	while_flag = false;
	for_flag = false;
}








module.exports = {
	parseAST: parseAST,
}


