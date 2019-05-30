var esprima = require('esprima');
var fs = require('fs');
var parser = require('/Users/yuji/Desktop/parse/code/parser.js')
var _ = require('lodash');

var function_declared = [];

/*
	Input: ast
	Output: all declared functions
*/
function parse_for_function(contents){
	for(var index in contents.body){
		var statement = contents.body[index];
    	if(statement.type == "FunctionDeclaration"&&(!function_declared.includes(statement.id.name))){
       		function_declared.push(statement.id.name);
       }
    }
}



/*
	Input: function name of root: String or []
	Output: array of non-repeating functions that are invoked
*/
function recur_func_search(curr, method_call, map){
	var func = map[curr];
	for(var index in func){
		if(!method_call.includes(func[index])){
			method_call.push(func[index]);
			recur_func_search(func[index], method_call, map);
		}
	}
	
	return method_call;
}

/*
	Input: name_invoked_method: map
	Output: number of library method
*/
function library_and_uncalled_function(){
	library_count=0;
	var method_call = recur_func_search("myMain",[]);
	for(var i in method_call){
		if(!function_declared.includes(method_call[i])){
			library_count++;
		}
	}
	return library_count;
}


function put_together(json, w, f){		// w and f should have same property name, otherwise reconstruct the function
	delete w.path;
	delete f.path;
	for(var i = 0;i<Object.keys(w).length; i++){
		var prop_name = Object.keys(w)[i];
		json["while_"+prop_name] = w[prop_name];
		
	}
	for(var i = 0;i<Object.keys(w).length; i++){
		var prop_name = Object.keys(w)[i];
		json["for_"+prop_name] = f[prop_name];
	}
	return json;
}

/*
	Input: json: the final json object
		   functions: map from function_name to times-appeared-in-total
*/
function mergeCount(json, functions, name_Count){
	property_list = Object.keys(Object.values(name_Count)[0]);
	for(var i = 0;i<property_list.length;i++){
		property = property_list[i];
		json[property] = json[property] == undefined? 0: json[property];
		for(var j = 0;j<Object.keys(functions).length;j++){
			function_name = Object.keys(functions)[j];
			function_count = functions[function_name];
			json[property]+=name_Count[function_name][property]*function_count;
	
		}
	}
	return json;
}

function a(name, name_times, cumulator, processed){
	var type_list = name_times[name];
	for(var i = 0;i<Object.keys(type_list).length;i++){	//iterate through regular, while, for
		var type = Object.keys(type_list)[i];
		var func_list = type_list[type];
		for(var j = 0;j<Object.keys(func_list).length;j++){	//iterate through function calls in each type
			var name = Object.keys(func_list)[i];
			if(processed.includes(name)){
				continue;
			}
			if(function_declared.includes(name)){		//list[i] is the custom function
				if(cumulator[name] == undefined){
					cumulator[name] = func_list[name];
				}
				else{
					cumulator[name]+=func_list[name];
				}
				processed.push(name);
				cumulator = a(name, name_times, cumulator, processed);
			}
		}
	}
	return cumulator
}

function b(name_times, list, regular, cumulator, processed){

	for(var i = 0;i<Object.keys(list).length;i++){
		var name = Object.keys(list)[i];
		if(processed.includes(name)){
			continue;
		}
		if(function_declared.includes(name)){		// if list[i] is the custom function
			if(cumulator[name] == undefined){
				cumulator[name] = list[name];
			}
			else{
				cumulator[name]+=list[name];
			}
			processed.push(name);
			cumulator = a(name, name_times, cumulator, processed);
		}
	}

	for(var i = 0;i<Object.keys(regular).length;i++){
		
		var name = Object.keys(regular)[i];
		if(processed.includes(name) || !function_declared.includes(name)){
			continue;
		}
		list = name_times[name].while;
		regular = name_times[name].regular;
		cumulator = b(name_times, list, regular, cumulator, processed);
	}
	return cumulator;
}

function total_function_call_loop(name_times, list, regular, cumulator, processed){
	for(var i = 0;i<Object.keys(list).length;i++){
		var name = Object.keys(list)[i];
		if(processed.includes(name)){
			continue;
		}
		if(function_declared.includes(name)){		//list[i] is the custom function
			if(cumulator[name] == undefined){
				cumulator[name] = list[name];
			}
			else{
				cumulator[name]+=list[name];
			}
			processed.push(name);
			cumulator = a(name, name_times, cumulator, processed);
		}
	}


	for(var i = 0;i<Object.keys(regular).length;i++){
		var name = Object.keys(regular)[i];
		if(processed.includes(name)){
			continue;
		}
		if(function_declared.includes(name)){		//list[i] is the custom function
			if(cumulator[name] == undefined){
				cumulator[name] = regular[name];
			}
			else{
				cumulator[name]+=regular[name];
			}
			processed.push(name);
			list = name_times[name].while;
			regular = name_times[name].regular;
			cumulator = b(name_times, list, regular, cumulator, processed);
		}
	}
	return cumulator;
}



function total_function_call_while_for(initial, name_times, cumulator, processed){
	var list = name_times[initial].while;
	var regular = name_times[initial].regular;
	cumulator.while = total_function_call_loop(name_times, list, regular, cumulator.while, processed);
	var list = name_times[initial].for;
	cumulator.for = total_function_call_loop(name_times, list, regular, cumulator.for, processed);
	return cumulator;

}

/*
*/
function total_function_call_regular(initial, name_times, cumulator, processed){
	var list = name_times[initial].regular;
	for(var i = 0; i<Object.keys(list).length;i++){ 	//iterate through regular function calls
		var name = Object.keys(list)[i];
		if(processed.includes(name)){
			continue;
		}
		if(function_declared.includes(name)){		//list[i] is the custom function
			if(cumulator[name] == undefined){
				cumulator[name] = list[name];
			}
			else{
				cumulator[name]+=list[name];
			}
			processed.push(name);
			cumulator = total_function_call_regular(name, name_times, cumulator, processed);
		}
	}
	return cumulator;
}



/*
	Input: Object{
		name_Count: map,
		name_invoked_function: map,
		string_logical: boolean,
	},
			function_declared: []
	Output:
*/
function reform_json(obj,function_declared){
	var function_called = [];	// change myMain to an array of functions returned
	function_called = function_called.concat(obj.initial_function_call);
	
	var json = {};
	json.path = "";
	json.string_logical = obj.string_logical;
// 

	total_function_call_list = {
		regular:{},
		while:{},
		for:{},
		initial:{},
	};

	for(var i in obj.initial_function_call){
		var f = obj.initial_function_call[i];
		total_function_call_list.regular = total_function_call_regular(f, obj.name_times, total_function_call_list.regular, []);
		total_function_call_list = total_function_call_while_for(f, obj.name_times, total_function_call_list, []);
		// total_function_call_list.for = total_function_call_for(f, obj.name_times, total_function_call_list.while, []);
		function_called = _.union(function_called, recur_func_search(f, [], obj.name_invoked_function)); 	
		if(total_function_call_list.initial[f] == undefined){
			total_function_call_list.initial[f]=1;
		}
		else{
			total_function_call_list.initial[f]+=1;	
		}
		
	}


	//	creating merged Regular count
	var name_Counts_object = {
		regular:{},
		while:{},
		for:{},
	};
	for(var i = 0;i<Object.keys(obj.name_Count).length;i++){
		var function_name = Object.keys(obj.name_Count)[i];
		name_Counts_object.regular[function_name] = obj.name_Count[function_name].count;
		name_Counts_object.while[function_name] = obj.name_Count[function_name].while_Count;
		name_Counts_object.for[function_name] = obj.name_Count[function_name].for_Count;
	}
	json = mergeCount(json, _.merge(total_function_call_list.regular, total_function_call_list.initial), name_Counts_object.regular);
	//	creating merged While count
	var merged_while = mergeCount({},total_function_call_list.while, obj.collapsed_count);
	merged_while = mergeCount(merged_while, total_function_call_list.initial, name_Counts_object.while);
	delete merged_while.while_count;
	delete merged_while.for_count;
	//	creating merged For count
	var merged_for = mergeCount({},total_function_call_list.for, obj.collapsed_count);
	merged_for = mergeCount(merged_for, total_function_call_list.initial, name_Counts_object.for);
	delete merged_for.while_count;
	delete merged_for.for_count;

	json = put_together(json, merged_while, merged_for);

	var custom_function_called = _.intersection(function_declared, function_called);
	//Calculating (Library_Parameter) and (Custom_Parameter)
	var library_para = [];
	var custom_para = [];
	var variable_used_in_if = [];

	for(var i in custom_function_called){
		library_para = _.union(library_para, obj.name_Count[custom_function_called[i]].library_parameter);
		custom_para = _.union(custom_para,obj.name_Count[custom_function_called[i]].custom_parameter);
		variable_used_in_if = _.union(variable_used_in_if, obj.name_Count[custom_function_called[i]].variable_used_in_if);
	}
	json.variable_used_in_if = variable_used_in_if.length;
	
	json.library_parameter = library_para.length;
	json.custom_parameter = custom_para.length;
	json.library_count = _.filter(function_called, function(name){ return !function_declared.includes(name);}).length;
	json.math_count = obj.math.length;
	// console.log(json)
	return json;
}



function parseBody(contents) {
	var ast = esprima.parse(contents);
	parse_for_function(ast);
	var obj = parser.parseAST(ast, function_declared);
	var json = reform_json(obj, function_declared); //library-count
	var alerts = obj.alerts;
	return [json, alerts];
}











function read_write(path){
	if(path.length==0){
		return;
	}
	var array = parseBody(fs.readFileSync(path,'utf8'));
	json = array[0];
	alerts = array[1];
	json.path = path;
	fs.writeFile(path+".json",JSON.stringify(json),(err)=>{
		if(err){
			console.error(err);
			return;
		}
	});
		fs.writeFile(path+"_output.json",JSON.stringify(alerts),(err)=>{
		if(err){
			console.error(err);
			return;
		}
	});
	alerts = [];
}

function parseLog(err, contents){
	let codeLog = contents;
	let index = codeLog.indexOf('\n');
	while(index!=-1){
		read_write(codeLog.substring(0,index));
		codeLog = codeLog.substring(index+1);
		index=codeLog.indexOf('\n');
	}
	read_write(codeLog);
}

// 



function myMain() {
	// fs.readFile('/Users/yuji/Desktop/parse/data/combined/While Loops/DIY_Shrinking squares/pathLog','utf8', parseLog);
	fs.readFile('/Users/yuji/Desktop/parse/test','utf8', parseLog);
}


function test(){

	console.log(parser);
}



myMain();
// test();


// function parseClassDec(statement){
// 	var count = new Count();
// 	let methods = statement.body.body;
// 	for(var index in methods){
// 		count.increment(parseBlockStatement(methods[index].value.body));
// 	}
// 	return count;
// }






// function methodCall(count){
// 	for(var name in name_times){
// 		var times = name_times[name];
// 		var func_count = name_Count[name];
// 		if(func_count!=undefined){
// 			count.increment(func_count.multiple(times));
// 		}
// 	}
// 	return count;
// }

