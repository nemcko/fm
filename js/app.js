(function() {
'use strict';

var crc32 = (function(){
	var table = new Uint32Array(256);

	for(var i=256; i--;)
	{
		var tmp = i;

		for(var k=8; k--;)
		{
			tmp = tmp & 1 ? 3988292384 ^ tmp >>> 1 : tmp >>> 1;
		}

		table[i] = tmp;
	}

	return function( data )
	{
		var crc = -1; 

		for(var i=0, l=data.length; i<l; i++)
		{
			crc = crc >>> 8 ^ table[ crc & 255 ^ data[i] ];
		}

		return (crc ^ -1) >>> 0; 
	};

})();

var supplant =  function( template, values, pattern ) {
	pattern = pattern || /\{([^\{\}]*)\}/g;
	return template.replace(pattern, function(a, b) {
		var p = b.split('.'),
			r = values;
		try {
			for (var s in p) { r = r[p[s]];  }
		} catch(e){
			r = a;
		}
		return (typeof r === 'string' || typeof r === 'number') ? r : a;
	});
};

Function.prototype.method = function (name, func) {
	this.prototype[name] = func;
	return this;
};

String.method("supplant", function( values, pattern ) {
	var self = this;
	return supplant(self, values, pattern);
});


String.supplant = supplant;


var app = angular.module('App', ['ngAnimate', 'ngMaterial', 'ngRoute','ngMdIcons'])
.config(['$logProvider', function($logProvider){
	$logProvider.debugEnabled(true);
}])

.value("ApiURL", "./api/index.php")
.value('animDurations', {
	fadeIn: 0.25,
	'puffIn': 1
})

.constant('MENUITEMS',[
	{
		name : 'Výber podľa',
		type : 'subheader',		
	},{
		name : 'Jedálny listok',
		type : 'menu',
		icon: 'local_restaurant',
		url : 'menu/list'
	},{
		name : 'Kategórie ponúk',
		type : 'menu',
		icon: 'storage',
		url : 'menu/category'
	},{
		name : 'Filter jedál podľa',
		type : 'subheader',
	},{
		name : 'Ceny',
		type : 'radio',
		icon: 'filter_frames',
		menuitem: 'prices',
		dataitems: [
			
			{ label: '5,-€ až 10,5€', value: '5-10.5'},
			{ label: '10,-€ až 15,5€', value: '10-15.5'},
			{ label: 'do 12€', value: '12-'},
			{ label: 'nad 12€', value: '-12'},
			{ label: '( * )', value: '-'},
		]
	},{
		name : 'Ingrediencie',
		type : 'menu',
		icon: 'grain',
		url : 'menu/ingredients'
	},{
		name : 'Porcie',
		type : 'menu',
		icon: 'local_cafe',
		url : 'menu/servings'
	} 
])



.factory("AppData", ['$http', '$q', '$mdDialog', '$timeout', 'ApiURL', function($http, $q, $mdDialog, $timeout, ApiURL) {
	return {
		request: function(m, p, d) {
			var deferred = $q.defer();
			var par={responseType: 'json', method: m, url: ApiURL+'/'+p};
			if (d) par.data=d;
			$http(par).success(function(result) {
				deferred.resolve(result);
			}).error(function(){
				deferred.reject();
			});
			return deferred.promise;
		},
		clearInputData: function(data){
			if ( data ){
				if (typeof data.isArray !== "undefined") {
					for (var i = 0; i < data.length; i++) {
						if ("_expanded" in data[i]) {
							delete data[i]["_expanded"];
						}
					}
				}
			}
			return data;
		},
		clearOutputData: function(data){
			if (data && angular.isArray(data) && data[0]===false){
				data.splice(0, 1);
			}
			return data;
		},
		PreList: function (inparams) {
			inparams.scope.processData=true;
			inparams.scope.expandedNew=false;
			inparams.scope.rowdata={};
			inparams.scope.rowid=null;
			inparams.scope.search="";
			inparams.scope.openDetail = function(item) {
				if ( item ){
					if (inparams.scope.expandedNew)
						inparams.scope.expandedNew=false;
					inparams.scope.rowdata={};
					inparams.scope.rowid=null;
					if ( inparams.scope.items ) {
						for (var i = 0; i < inparams.scope.items.length; i++) {
							if ( item!==inparams.scope.items[i] ){
								inparams.scope.items[i]._expanded=false;
							} else {
								inparams.scope.rowdata=inparams.scope.items[i];
								inparams.scope.rowid=inparams.scope.items[i].id;
								if (!item._expanded)
									item._expanded=true;
							}
						}
					}
				} else {
					inparams.scope.rowdata={};
					inparams.scope.rowid=null;
					if ( inparams.scope.items ) {
						for (var i = 0; i < inparams.scope.items.length; i++) {
							if (inparams.scope.items[i]._expanded)
								inparams.scope.items[i]._expanded=false;							
						}
					}
					if (!inparams.scope.expandedNew)
						inparams.scope.expandedNew=true;
				}
			};
			inparams.scope.closeDetail = function(item) {
				if ( item ){
					if ( inparams.scope.items ) {
						for (var i = 0; i < inparams.scope.items.length; i++) {
							inparams.scope.items[i]._expanded=false;
						}
					}
				} else {
					inparams.scope.expandedNew=false;
				}
			};
			//if (!inparams.scope.$$phase) {
			//	inparams.scope.$apply();
			//} 
		},
		PosList: function (inparams,data) {
			inparams.scope.processData=true;
			data=this.clearOutputData(data);
			if ( data ) {
				for (var i = 0; i < data.length; i++) {
					var newField='_expanded';
					data[i][newField]=false;
				}
			}
			inparams.scope.items=data;
			inparams.scope.processData=false;
		},
		Update: function (inparams) {			
			inparams.scope.destroy = function(ev) {
				var confirm = $mdDialog.confirm()
					.title('Vymazať položku')
					.content('Chcete vymazať túto položku?')
					.ariaLabel('Vymazať položku')
					.ok('Áno')
					.cancel('Nie')
					.targetEvent(ev);
					$mdDialog.show(confirm).then(function() {
						inparams.me.delItem(inparams.name,inparams.scope.rowdata).then(function(data) {
							data=inparams.me.clearOutputData(data);
							inparams.scope.rowdata={};
							inparams.scope.rowid=null;
							inparams.scope.items=data;
							if ( data )
								for (var i = 0; i < data.length; i++) {
									var newField='_expanded';
									data[i][newField]=false;
								}
							inparams.scope.expandedNew=false;
						});
					}, function() {
						
					});				
			};
			inparams.scope.save = function() {
				inparams.scope.processData=true;
				if (inparams.scope.rowid==undefined) {
					inparams.me.newItem(inparams.name,inparams.scope.rowdata).then(function(data) {
						data=inparams.me.clearOutputData(data);
						if ( data ) {
							for (var i = 0; i < data.length; i++) {
								var newField='_expanded';
								data[i][newField]=false;								
							}
							
						}

						inparams.scope.items=data;
						inparams.scope.expandedNew=false;
					});
				} else {
					inparams.me.updItem(inparams.name,inparams.scope.rowdata).then(function(data) {
						data=inparams.me.clearOutputData(data);
						if ( data )
						for (var i = 0; i < data.length; i++) {
							var newField='_expanded';
							data[i][newField]=false;
						}

						inparams.scope.items=data;
						inparams.scope.expandedNew=false;
					});
				}
				inparams.scope.processData=false;
			};
		}			

	}
}])
.factory("DbData", ['AppData', '$mdDialog' , function(apd,$mdDialog) {
	return {
		clearOutputData: function(data){
			return apd.clearOutputData(data);
		},
		getItems: function(name) { 
			return apd.request('GET', name);
		},
		newItem: function(name,data) { 
			return apd.request('POST', name, apd.clearInputData(data));
		},
		delItem: function(name,data) { 
			return apd.request('DELETE', name, data);
		},
		updItem: function(name,data) { 
			return apd.request('PUT', name, apd.clearInputData(data));
		},
		setValues: function(name,data) { 
			return apd.request('PUT', name, data);
		},
		PreList: function (inparams) {
			inparams.scope.processData=true;
			inparams.scope.expandedNew=false;
			inparams.scope.rowdata={};
			inparams.scope.rowid=null;
			inparams.scope.search="";

			if (inparams.scope.expandedNew)
				inparams.scope.expandedNew=false;
			if ( inparams.scope.items ) {
				for (var i = 0; i < inparams.scope.items.length; i++) {
					inparams.scope.rowdata=inparams.scope.items[i];
					inparams.scope.rowid=inparams.scope.items[i].id;
					inparams.scope.items[i]._expanded=false;
				}
			}
		},
		List: function (inparams) {
			apd.PreList(inparams);
			this.getItems(inparams.name).then(function (data) {
				apd.PosList(inparams,data);
			});
		},
		PosList: function (inparams,data) {
			apd.PosList(inparams,data);
		},
		Update: function (inparams) {
			apd.Update(inparams);
		},
		Dict: function (inparams) {
			this.getDataItems(inparams.name,inparams.field).then(function (data) {
				inparams.scope[inparams.dict]=data;
			});	
		}
	}
}])
.factory("ConfigData", ['AppData','$mdDialog', function(apd,$mdDialog) {
	return {
		clearOutputData: function(data){
			return apd.clearOutputData(data);
		},
		getItems: function(name) { 
			return apd.request('GET', "config?_Data_="+name);
		},
		getDataItems: function(name,data) { 
			return apd.request('GET', "config?_Data_="+name+'&_Field_='+data);
		},
		newItem: function(name,data) { 
			return apd.request('POST', "config?_Data_="+name, apd.clearInputData(data));
		},
		delItem: function(name,data) { 
			return apd.request('DELETE', "config?_Data_="+name, data);
		},
		updItem: function(name,data) { 
			return apd.request('PUT', "config?_Data_="+name, apd.clearInputData(data));
		},
		setValues: function(name,data) { 
			return apd.request('PUT', "config?_Values_="+name, data);
		},
		List: function (inparams) {
			apd.PreList(inparams);
			this.getItems(inparams.name).then(function (data) {
				data=apd.clearOutputData(data);
				if ( data ) {
					for (var i = 0; i < data.length; i++) {
						var newField='_expanded';
						data[i][newField]=false;
					}
				}
				inparams.scope.items=data;
			});
		},
		PosList: function (inparams,data) {
			apd.PosList(inparams,data);
		},
		Update: function (inparams) {
			apd.Update(inparams);
		},
		Dict: function (inparams) {
			this.getDataItems(inparams.name,inparams.field).then(function (data) {
				inparams.scope[inparams.dict]=data;
			});	
		},
		Values: function (inparams) {
			this.getItems(inparams.name).then(function (data) {
				inparams.scope.items=data;
			});
			
			inparams.scope.save = function(ev) {
				inparams.me.setValues(inparams.name,apd.clearOutputData(inparams.scope.items)).then(function(data) {
					$mdDialog.show(
							$mdDialog.alert()
							.title('Uloženie údajov')
							.content(inparams.message)
							.ariaLabel('Uloženie údajov')
							.ok('Zatvoriť')
							.targetEvent(ev)
					);		
				});
			};
		}
	}
}])

.service('$timeline',['$rootScope','$q', '$log', function($rootScope, $q, $log) {
	var tweenReset = function(element) {
		TweenMax.set(element, { autoAlpha: 1, scale: 1, rotation: 0, x: 0 });
	};

	function resetTimeline(target) {
		var targets = angular.isArray(target) ? target : [ target ];
		targets.forEach(function(it) {
			tweenReset(it);
		});
	}

	return {
		start : startTimeline,
		reset : resetTimeline
	};
	
	function startTimeline(target, tweenSteps, start, done) {
		var animationSteps = [].concat(tweenSteps);

		start = start || angular.noop;
		done = done || angular.noop;

		return createChain(target);

		function createChain(target) {
			return animationSteps.reduce(function(
				promise, step) {
				return promise.then(function() {
					return buildStep(step, target);
				});
			}, $q.when(true));
		}

		function buildStep(step, target) {
			var deferred = $q.defer();
			var startFn = function(start) {
				return function() {
					$rootScope.$apply(function() {
						$log.debug("TweenMax('{0}' on '{1}') started.".supplant([step.name,target.selector ]));
						start(step.name);
					});
				};
			};
			var doneFn = function(done) {
				return function() {
					$rootScope.$apply(function() {
						$log.debug("TweenMax('{0}' on '{1}') finished.".supplant([step.name,target.selector ]));
						done(step.name);
					});
					deferred.resolve(step.name);
			}
		};

		step.tween(target, startFn(start),doneFn(done));
		return deferred.promise;
	}
}
}])

.factory("AppDetail", ['$rootScope','$q', '$timeout', '$timeline', 'DbData', function($rootScope,$q, $timeout, $timeline, DbData) {
	return {
		foodtiles: function(items,show){
//			return;
			var animatearray = [],
			seq = 0 ,twfrom,twto,
			animateElement = function(selector, steps, delay){
				var deferred = $q.defer();
				$timeout(function() {
					return $timeline.start($(selector), steps );
				}, delay || 0, false);
				return deferred.promise;
			};

			if (show){
				twfrom = TweenMax.to;
				twto = TweenMax.from;
			} else {
				twfrom = TweenMax.from;
				twto = TweenMax.to;
			}

			angular.forEach(items, function(item) {
				animatearray.push(animateElement('.tilearea'+seq, 
					{	name: "seq"+(seq),
						tween : function(element, start, done) {
							twfrom(element, 0.8, { delay: 0, scaleX: 0.0, scaleY: 0.0});
						}
					}
				));
				animatearray.push(animateElement('.tilearea'+seq + ' .price, .tilearea'+seq + ' .tilefooter', 
					{	name: "seq"+(seq),
						tween : function(element, start, done) {
							twto(element, 0.8, { delay: 0.6, opacity:1});
						}
					}
				));
				seq++;
			});
			
			if (animatearray.length){
				var animSeq = function(twfrom,twto){ 
					$q.all(animatearray);
					animatearray=[];
				}; 
			
				animSeq(twfrom,twto);
			}
		},
		foodtile: function(element,show,doneFn){
			var scope=element.scope();
			var idx=scope.$index;
//			console.log(idx+'|'+show);
			var animSeq=function(){}, animateElement = function(selector, steps, delay){
				var deferred = $q.defer();
				$timeout(function() {
					return $timeline.start($(selector), steps );
				}, delay || 0, false);
				return deferred.promise;
			}
			animSeq = function(twfrom,twto){ 
				$q.all([
					animateElement('.tilearea'+idx, 
						{	name: "img"+idx,
							tween : function(element, start, done) {
								twfrom(element, 0.5, { delay: idx/10, autoAlpha: twfrom==TweenMax.from?1:0, scaleX: 0.0, scaleY: 0.0});
							}
						}
					),
					animateElement('.tilearea'+idx + ' .price, .tilearea'+idx + ' .tilefooter',
						{	name: "desc"+idx,
							tween : function(element, start, done) {
								twto(element, 0.5, { delay: idx/10 + 0.1, opacity:1});
							}
						}
					)
				]);
			}
			if (show){
				animSeq(TweenMax.from,TweenMax.to);
			} else {
				animSeq(TweenMax.to,TweenMax.from);
			}
			if (doneFn)
				doneFn();
		},
		animate: function(type,item,seq){
			var animSeq=function(){}, animateElement = function(selector, steps, delay){
				var deferred = $q.defer();
				$timeout(function() {
					return $timeline.start($(selector), steps );
				}, delay || 0, false);
				return deferred.promise;
			}
			if (type=='tile'){
				animSeq = function(twfrom,twto){ 
					$q.all([
						animateElement('.tilearea'+seq, 
							{	name: "tile",
								tween : function(element, start, done) {
									twfrom(element, .8, { delay: seq/10, autoAlpha: 0.2, scaleX: 0, scaleY: 0});
								}
							}
						)
					]);
				}
				if (item===undefined){
					animSeq(TweenMax.to,TweenMax.from);
				} else {
					animSeq(TweenMax.from,TweenMax.to);
				}
			} else if (type=='detail'){
				animSeq = function(twfrom,twto){ 
					$q.all([
					    animateElement('#page-tiles', 
							{	name: "hide",
								tween : function(element, start, done) {
									twfrom(element, 0, { autoAlpha: twfrom==TweenMax.from?0:1 } );
								}
							}
						),
						animateElement('#page-detail-header', 
							{	name: "move0-2",
								tween : function(element, start, done) {
									twfrom(element, 1.0, { x: twfrom==TweenMax.from?'-100%':'0px'} );
								}
							}
						),
						animateElement('#page-detail-picture', 
							{	name: "move1",
								tween : function(element, start, done) {
									twfrom(element, 1.0, { 
										delay:0.1, 
										autoAlpha: 0, 
										scaleX: 1, 
										scaleY: 0,
										y: '-50%'
									});
								}
							}
						),
						animateElement('#page-section', 
							{	name: "move2",
								tween : function(element, start, done) {
									twfrom(element, 1.0, { x: '-100%'} );
								}
							}
						),
						animateElement('#page-detail .md-fab,#page-detail h4', 
							{	name: "move3",
								tween : function(element, start, done) {
									twfrom(element, 1.0, { x: '100%'} );
								}
							}
						),
						animateElement('#page-tiles', 
							{	name: "hide2",
								tween : function(element, start, done) {
									twto(element, .3, { delay:0, autoAlpha: twfrom==TweenMax.to?1:0 } );
								}
							}
						)
					]);
				}
				if (item===undefined){
					animSeq(TweenMax.to,TweenMax.from);
					$timeout(function(){
						if ($rootScope.CurrentScope.pageofsY){
							document.getElementById("page-view").scrollTop=$rootScope.CurrentScope.pageofsY;
						}
						$rootScope.CurrentScope.$parent.showDetail();
					},500);
				} else {
					var divid = document.getElementById("page-view");
					$rootScope.CurrentScope.pageofsY=divid.scrollTop;

					$rootScope.CurrentScope.item = item;
					animSeq(TweenMax.from,TweenMax.to);
					$rootScope.CurrentScope.$parent.showDetail(item.lgname + ' ('+item.code+')');
					$timeout(function(){
						divid.scrollTop=0;
					},200);
				}
			}	
		}, 
		initScope: function(scope,uri){
			var self=this;
			$rootScope.CurrentScope = scope;
			$rootScope.CurrentScopeUri = uri;
			scope.$parent.showDetail();
			DbData.getItems($rootScope.CurrentScopeUri).then(function (data) {	
			$rootScope.CurrentScope.loadeditems=data;
				$rootScope.CurrentScopeItemsCRC = 0;
				$rootScope.CurrentScope.items=data;
//				self.showTiles(data);
				$rootScope.CurrentScope.$watch(function(scope) { return scope.CurrentScopeItemsCRC }, function(newValue, oldValue) {
					self.foodtiles($rootScope.CurrentScope.items);
				});				
			});	
		},
		showTiles: function(items){
			var crc = crc32(angular.toJson(items));
			if ($rootScope.CurrentScopeItemsCRC!=crc) {
//$rootScope.CurrentScope.items=items;
				$rootScope.CurrentScopeItemsCRC = crc;
			}
		},
		getSelectedItems: function(flt){
			var self=this;
			var filter = {};
			var result = [];
			filter['searchtext']=$rootScope.searchtext?$rootScope.searchtext:null;
			if (angular.isArray($rootScope.appmenu.sections)){
				angular.forEach($rootScope.appmenu.sections, function(selection) {
					if (selection.menuitem){
						switch (selection.menuitem){
							case 'prices':
							case 'servings':
								filter[selection.menuitem]=selection.value?selection.value:null;
								break;
							case 'ingredients':
								filter[selection.menuitem]=angular.element(document.querySelector('#menu-ingredients')).scope().ingredients;
								break;
						}
					}
				})
			}
			angular.forEach($rootScope.CurrentScope.loadeditems, function (item) {
				var ok = true;
				if (ok && filter['searchtext'] ){
					if (item.lgname.toUpperCase().search(filter['searchtext'].toUpperCase())==-1 )//&& item.txt.search(filter['searchtext'])==-1 )
						ok = false;
				}
				if (ok && item.servings ){
					if (ok){
						var oksize = false;
						angular.forEach(item.servings, function (itm) {
							if ( filter['prices'] && filter['prices']!='-' ){
								var prices = filter['prices'].split('-');
								if (ok && prices[0] && prices[1] && (itm.price < prices[0] || itm.price > prices[1])) 
									ok = false;
								else
								if (ok && !prices[0] && prices[1] && (itm.price <= prices[1])) 
									ok = false;
								else
								if (ok && prices[0] && !prices[1] && (itm.price >= prices[0])) 
									ok = false;
							}
							if ( filter['servings'] && filter['servings']!='-' ){
								if ( itm.idsize==filter['servings'] )
									oksize = true;
//								console.log("servings: {0} | {1} | {2}".supplant([item.lgname,itm.idsize,filter['servings'] ]));
							} else
								oksize = true;
						});
						if (!oksize) 
							ok = false;
					}
				}
				if (ok && item.ingredients && filter['ingredients'].length ){
					if ( filter['ingredients'].length ) {
						var oking = false;
						angular.forEach(item.ingredients, function (itm) {
							if ( !oking && filter['ingredients'] ){
								angular.forEach(filter['ingredients'], function (iitm) {
									if (itm.iding==iitm.value || iitm.value=='-') 
										oking = true;
								});
							}
	//						console.log("ingredients: {0} | {1} | {2}".supplant([item.lgname,itm.idsize,filter['servings'] ]));
						});
						if (!oking) 
							ok = false;
					}
				}
				if (ok){
					result.push(item);
				}				
			});
//			if (flt){
//				console.log((new Date()).getTime() + ': ' + result.length);
			return result;
		}
	}
}])	
	
.config(['$routeProvider','$mdThemingProvider','$provide','MENUITEMS', function($routeProvider, $mdThemingProvider,$provide,MENUITEMS) {	

	$provide.service('MenuSvc',  ['$q', function($q) {
		this.menuitems = MENUITEMS;
		this.rooteMenuItem = rooteMenuItem;
		
		this.curMenuItem = function(location){
			var path=location.path();
			var sel = null;
			var matchUrl = function(items, url) {
				angular.forEach(items, function(item) {
					if ( item.type=='link' && url === item.url) {
						sel = item;
					} else if ( item.type=='toggle' ) {
						matchUrl(item.dataitems,url);
					}
				});
			};
			matchUrl(this.menuitems,path);
			return sel;
		};
		
		this.buildMenu = function(url,DbData,rootScope,location,$window){
			var deferred = $q.defer();
			var promises = [];
			var slf = this;
			slf.rootsc=rootScope;
			
			rootScope.menuItems=this.menuitems;

			function loadMenuItems(item){
				var deferred = $q.defer();
				DbData.getItems(item.url).then(function (data) {
					item.dataitems = data.items;
					item.type = data.type;
					item.menuitem = data.menuitem;
					deferred.resolve(item);
				},function(){
					deferred.reject();
				});
				return deferred.promise;
			}

			function buildRoute() {
				var homeItem=null;
				deferred.resolve();
				angular.forEach(slf.menuitems, function(item) {
					slf.rooteMenuItem(item);
					if (homeItem==null && item.dataitems){
						homeItem = item.dataitems[0];
					}
				});
				
//				slf.rooteMenuItem(null);
				
//				$routeProvider.when('/', {
//					templateUrl: 'partials/home.tpl.html',
//					controller: 'HomeCtrl'
//				})
				if (homeItem){
					$routeProvider.otherwise(homeItem.url);
				}
				slf.rootsc.$route.reload();
				slf.rootsc.$emit('$locationChangeSuccess');
			}

			angular.forEach(this.menuitems, function(item) {
				if ( item.type=='toggle') {
					angular.forEach(item.dataitems, function(itm) {
						if ( itm.type=='menu') {
							promises.push(loadMenuItems(itm));
						}
					});
				} else if ( item.type=='menu') {
					promises.push(loadMenuItems(item));
				} 
			});

			$q.all(promises).then(buildRoute);

			return deferred;

		};

	}])
	

	function rooteMenuItem(item) {
		if (item){
			if ( item.type=='link' && item.url){
				item.url = '/' + item.url;
				$routeProvider.when(item.url, {
//				app.routeProvider.when(item.url, {
					templateUrl: item.templateUrl,
					controller: (item.controller?item.controller:'AppCtrl')
				});
			} else if ( item.type=='toggle') {
				angular.forEach(item.dataitems, function(itm) {
					rooteMenuItem(itm);
				});
			} 
		} 
	}
	
	$mdThemingProvider.theme('blue').primaryPalette('blue').accentPalette(
	'red');
}])


.factory('AppMenu',['$location','$rootScope','MenuSvc', function($location,$rootScope,MenuSvc) {

	function sortByName(a, b) {
		return a.name < b.name ? -1 : 1;
	}

	var self;

	$rootScope.$on('$locationChangeSuccess', onLocationChange);
	
	return self = {
			sections : $rootScope.menuItems,

			selectSection : function(section) {
				self.openedSection = section;
			},
			toggleSelectSection : function(section) {
				self.openedSection = (self.openedSection === section ? null : section);
			},
			isSectionSelected : function(section) {
				return self.openedSection === section;
			},

			selectPage : function(section, page) {
				self.currentSection = section;
				self.currentPage = page;
			},
			isPageSelected : function(page) {
				return self.currentPage === page;
			},
			locationChanged: function () {
				var path = $location.path();
				var matchPage = function(section, page) {
					if (path === page.url) {
						self.selectSection(section);
						self.selectPage(section, page);
					}
				};
				if ($rootScope.menuItems){
					$rootScope.menuItems.forEach(function(section) {
						if (section.children) {
							section.children.forEach(function(childSection) {
								if (childSection.dataitems) {
									childSection.dataitems
									.forEach(function(page) {
										matchPage(childSection,page);
									});
								}
							});
						} else if (section.dataitems) {
							section.dataitems.forEach(function(page) {
								matchPage(section,page);
							});
						} else if (section.type === 'link') {
							matchPage(section, section);
						}
					});
				}
			}
		};


	function sortByHumanName(a, b) {
		return (a.humanName < b.humanName) ? -1 : (a.humanName > b.humanName) ? 1 : 0;
	}

	function onLocationChange() {
		self.locationChanged();
	}
}])



.filter('nospace', function () {
	return function (value) {
		return (!value) ? '' : value.replace(/ /g, '');
	};
})

.directive('menuLink', function() {
	return {
		scope: {
			section: '='
		},
		templateUrl: 'partials/menu-link.tmpl.html',
		link: function($scope, $element) {
			var controller = $element.parent().controller();

			$scope.isSelected = function() {
				return controller.isSelected($scope.section);
			};

			$scope.focusSection = function() {
				controller.autoFocusContent = true;
			};
		}
	};
})

.directive('menuRadio', function() {
	return {
		scope: {
			section: '='
		},
		templateUrl: 'partials/menu-radio.tmpl.html',
		link: function($scope, $element) {
			var controller = $element.parent().controller();

			$scope.isOpen = function() {
				return controller.isOpen($scope.section);
			};
			$scope.toggle = function() {
				controller.toggleOpen($scope.section);
			};
		}
	};
})

.directive('menuCheck', function() {
	return {
		scope: {
			section: '='
		},
		templateUrl: 'partials/menu-check.tmpl.html',
		link: function($scope, $element) {
			var controller = $element.parent().controller();
			$scope.isOpen = function() {
				return controller.isOpen($scope.section);
			};
			$scope.toggle = function() {
				controller.toggleOpen($scope.section);
			};

			$scope.xtoggle = function (item, name) {
				var idx = -1;
				if (!($scope[name] || angular.isArray($scope[name]))){
					$scope[name]=[];
				}
				var list = $scope[name];
				if (list){
					for (var i = 0; i < list.length; i++) {
						if (list[i] === item) {
							idx=i;
							break;
						}
					}

					if (idx > -1) list.splice(idx, 1);
					else list.push(item);
				} else {
					list=[];
				}
			};
			$scope.exists = function (item, name, list) {
				if (!($scope[name] || angular.isArray($scope[name]))){
					$scope[name]=[];
				}
				return $scope[name].indexOf(item) > -1;
			};
			
			$scope.focusSection = function() {
				controller.autoFocusContent = true;
			};
			
		}
	};
})

.directive('menuSubheader', function() {
	return {
		scope: {
			section: '='
		},
		templateUrl: 'partials/menu-subheader.tmpl.html',
		link: function($scope, $element) {
//			var controller = $element.parent().controller();
//
//			$scope.isSelected = function() {
//				return controller.isSelected($scope.section);
//			};
//
//			$scope.focusSection = function() {
//				controller.autoFocusContent = true;
//			};
		}
	};
})

.directive('menuToggle', function() {
	return {
		scope: {
			section: '='
		},
		templateUrl: 'partials/menu-toggle.tmpl.html',
		link: function($scope, $element) {
			var controller = $element.parent().controller();

			$scope.isOpen = function() {
				return controller.isOpen($scope.section);
			};
			$scope.toggle = function() {
				controller.toggleOpen($scope.section);
			};
//
//			var parentNode = $element[0].parentNode.parentNode.parentNode;
//			if(parentNode.classList.contains('parent-list-item')) {
//				var heading = parentNode.querySelector('h2');
//				$element[0].firstChild.setAttribute('aria-describedby', heading.id);
//			}
		}
	};
})
.filter("mena",function(numberFilter) {
	function isNumeric(value) {
		return (!isNaN(parseFloat(value)) && isFinite(value));
	}

	return function(inputNumber, currencySymbol,decimalSeparator, thousandsSeparator, decimalDigits) {
		if (isNumeric(inputNumber)) {
			currencySymbol = (typeof currencySymbol === "undefined") ? "€" : currencySymbol;
			decimalSeparator = (typeof decimalSeparator === "undefined") ? "," : decimalSeparator;
			thousandsSeparator = (typeof thousandsSeparator === "undefined") ? " " : thousandsSeparator;
			decimalDigits = (typeof decimalDigits === "undefined" || !isNumeric(decimalDigits)) ? 2 : decimalDigits;

			if (decimalDigits < 0)
				decimalDigits = 0;

			var formattedNumber = numberFilter(inputNumber,
					decimalDigits);

			var numberParts = formattedNumber.split(".");

			numberParts[0] = numberParts[0].split(",").join(
					thousandsSeparator);

			var result = numberParts[0];

			if (numberParts.length == 2) {
				result += decimalSeparator + numberParts[1];
			}

			return result+currencySymbol;
		} else {
			return inputNumber;
		}
	};
})

//.filter('property', function(){
//	function parseString(input){
//		return input.split(".");
//	}
//
//	function getValue(element, propertyArray){
//		var value = element;
//
//		_.forEach(propertyArray, function(property){
//			value = value[property];
//		});
//
//		return value;
//	}
//
//	return function (array, propertyString, target){
//		var properties = parseString(propertyString);
//
//		return _.filter(array, function(item){
//			return getValue(item, properties) == target;
//		});
//	}
//})
//ng-init="onlyFailed=false"/>
//<li ng-repeat="entry in data.entries | property:'test.status.pass':!onlyFailed">

//angular.module('app').filter('objectByKeyValFilter', function () {
//return function (input, filterKey, filterVal) {
//    var filteredInput ={};
//     angular.forEach(input, function(value, key){
//       if(value[filterKey] && value[filterKey] !== filterVal){
//          filteredInput[key]= value;
//        }
//     });
//     return filteredInput;
//}});
//like this:
//
//<div ng-repeat="(key, value) in data | objectByKeyValFilter:'type':'foo'">{{key}}{{value.type

//myApp.filter('myFilter', function () {
//    return function (items, search) {
//        var result = [];
//        angular.forEach(items, function (value, key) {
//            angular.forEach(value, function (value2, key2) {
//                if (value2 === search) {
//                    result.push(value2);
//                }
//            })
//        });
//        return result;
//
//    }
//});
//        <input ng-model="searchText">
//        <div ng-repeat="(k,v) in items | myFilter:searchText">
//            {{v}}


//angular.module("myApp",[])
//.filter('slug', function () {
//     return function (input) {
//       if (input) {
//         return input.toLowerCase().replace(/[^a-z_]/g, '_');
//       }
//     };
//   });
//
//function CustomScopeController($scope, $filter){
//  var userName = 'Rob Stinogle';
//      $scope.userSlug = $filter('slug')(userName);
//      console.log($scope.userSlug); 
//}







.filter('selectitems', function($rootScope,$log,AppDetail){
	return function (items) {
//		return AppDetail.getSelectedItems();
		var newitems = AppDetail.getSelectedItems();
		AppDetail.showTiles(newitems);
		return newitems;
	}
})





.directive("repeatDelimiter",function() {
	function compile( element, attributes ) {
		var delimiter = ( attributes.repeatDelimiter || "," );
		var delimiterHtml = (
			"<span ng-show=' ! $last '>" +
			delimiter +
		"</span>"
		);
		var html = element.html().replace(/(\s*$)/i,function( whitespace ) {
			return( delimiterHtml + whitespace );
		});

		element.html( html );
	}
	return({
		compile: compile,
		priority: 1001,
		restirct: "A"
	});
})

;


app.run(['$templateCache','MenuSvc','ApiURL','$q','$timeout','DbData','$rootScope','$location','$window','$document',
function($templateCache,MenuSvc,ApiURL,$q,$timeout,DbData,$rootScope,$location,$window,$document) {
	MenuSvc.buildMenu(ApiURL,DbData,$rootScope,$location,$window);
}]);


app.controller('AppCtrl', ['$scope', '$mdDialog', '$mdSidenav','AppMenu', '$rootScope','$timeout', '$log' ,'$route', '$routeParams', '$location', 'DbData' ,
	function($scope, $mdDialog, $mdSidenav,AppMenu,$rootScope,$timeout,$log,$route, $routeParams, $location,DbData ) {

	$scope.$parent.$route = $route;
	$scope.$parent.appmenu = AppMenu;

	$scope.showSearchIcon='search';
	$scope.showSearchOptions='{"rotation": "counterclock"}'
	$scope.showSearchToggle=function(){		
		if ($scope.showSearchText) {
			$scope.showSearchIcon='search';
			$scope.showSearchOptions='{"rotation": "counterclock"}'
		} else {
			$scope.showSearchIcon='find_in_page';
			$scope.showSearchOptions='{"rotation": "clock"}'
		}
		$scope.showSearchText = !$scope.showSearchText;		
	}

	$scope.pressKey = function(keyEvent) {
		if (keyEvent.which === 27 && $scope.detailDisplayed){
			$scope.showDetail(false);
		}
		if (!$scope.detailDisplayed && $scope.CurrentScope){
			switch (keyEvent.which){
			case 27:
				$scope.searchtext = '';
				$rootScope.searchtext = '';
				break;
			case 13:
			case 8:
				$rootScope.searchtext = $scope.searchtext;
				break;
			}
		}
	}

	$scope.detailDisplayed = false;
	$scope.showDetail=function(title){
		if ( title==undefined || title==false ) {
			if ($scope.detailTitle){
				var closeproc = $scope.CurrentScope && $scope.CurrentScope.animateDetail ? $scope.CurrentScope.animateDetail : null;
				if (closeproc ){
					$scope.detailTitle = '';
					closeproc();
					return;
				}
			} 
			$scope.detailDisplayed = false;
			$scope.detailTitle = '';
//			angular.element(document.querySelector('#page-tiles')).css('opacity', 1);
		} else {
			if (typeof title !== 'object') {
				$scope.detailDisplayed = true;
				$scope.detailTitle = title;
			} else {
//				var view = angular.element(document.querySelector('[ng-view]'));
//				if (view){
//					var scope=view.scope();
//					scope.showDetail(title);
//				}
//				title.$parent.showDetail(title.item);
			}
		}
	}
	$scope.menuloaded=false;

	$scope.menu = AppMenu;
	$scope.path = path;
	$scope.goHome = goHome;
	$scope.openMenu = openMenu;
	$scope.closeMenu = closeMenu;
	$scope.isSectionSelected = isSectionSelected;
	$rootScope.$on('$locationChangeSuccess', openPage);
	$scope.focusMainContent = focusMainContent;

	$scope.toggleSidenav = function(menuId) {
		$mdSidenav(menuId).toggle();
	}
	
	this.isOpen = isOpen;
	this.isSelected = isSelected;
	this.toggleOpen = toggleOpen;
	this.autoFocusContent = false;

	var mainContentArea = document.querySelector("[role='main']");

	function closeMenu() {
		$timeout(function() { $mdSidenav('left').close(); });
	}

	function openMenu() {
		$timeout(function() { $mdSidenav('left').open(); });
	}

	function path() {
		return $location.path();
	}

	function goHome($event) {
		AppMenu.selectPage(null, null);
		$location.path( '/' );
	}

	function openPage() {
		$scope.closeMenu();

		if (self.autoFocusContent) {
			focusMainContent();
			self.autoFocusContent = false;
		}
	}

	function focusMainContent($event) {
		// prevent skip link from redirecting
		if ($event) { $event.preventDefault(); }

		$timeout(function(){
			mainContentArea.focus();
		},90);

	}

	function isSelected(page) {
		return AppMenu.isPageSelected(page);
	}

	function isSectionSelected(section) {
		var selected = false;
		var openedSection = AppMenu.openedSection;
		if(openedSection === section){
			selected = true;
		}
		else if(section.children) {
			section.children.forEach(function(childSection) {
				if(childSection === openedSection){
					selected = true;
				}
			});
		}
		return selected;
	}

	function isOpen(section) {
		return AppMenu.isSectionSelected(section);
	}

	function toggleOpen(section) {
		AppMenu.toggleSelectSection(section);
	}

}])

//.controller('HomeCtrl', ['$scope', function($scope) {
//}])

.controller('FoodmenuListCtrl', ['$scope', '$rootScope', '$location', 'DbData', 'MenuSvc', 'AppDetail', function($scope, $rootScope, $location, DbData, MenuSvc, AppDetail) {
	AppDetail.initScope($scope,'meals/'+MenuSvc.curMenuItem($location).id+'/menu');
	$scope.getImgClass = function(idx){
		return 'tilearea'+idx;
	}
	$scope.animateDetail = function(item){
		AppDetail.animate('detail',item);
	};
}])

.controller('FoodmenuCategoryCtrl', ['$scope', '$rootScope', '$location', 'DbData', 'MenuSvc', 'AppDetail', function($scope, $rootScope, $location, DbData, MenuSvc, AppDetail) {
	AppDetail.initScope($scope,'meals/'+MenuSvc.curMenuItem($location).id+'/category');
	$scope.getImgClass = function(idx){
		return 'tilearea'+idx;
	}
	$scope.animateDetail = function(item){
		AppDetail.animate('detail',item);
	};
}])



;


angular.element( document ).ready(function() {
	angular.bootstrap(document, ['App']);
	angular.element(".docs-title,.docs-menu").show();
	angular.element(".docs-headitem").show();
});

})();