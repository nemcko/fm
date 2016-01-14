angular.module('app', ['ngRoute','ui.bootstrap','textAngular'])
.value('dataURL', '../api/index.php')
	
.factory('DataSet', function($http, $q, $timeout, dataURL) {
	function req(m, p, d) {
		var deferred = $q.defer();
		var par={responseType: 'json', method: m, url: dataURL+'/'+p};
		if (d) par.data=d;
		$http(par).success(function(result) {
			deferred.resolve(result);
		}).error(function(){
			deferred.reject();
		});
		return deferred.promise;
	};
	return {
		getItems: function(name) { 
			return req('GET', name);
		},
		newItem: function(name,data) { 
			return req('POST', name, data);
		},
		delItem: function(name,data) { 
			return req('DELETE', name, data);
		},
		updItem: function(name,data) { 
			return req('PUT', name, data);
		},
		setValues: function(name,data) { 
			return req('PUT', name, data);
		},
		Dict: function (inparams) {
			this.getDataItems(inparams.name,inparams.field).then(function (data) {
				inparams.scope[inparams.dict]=data;
			});	
		},
		List: function (inparams) {
			this.getItems(inparams.name).then(function (data) {
				inparams.scope.items=data;
			});
			inparams.scope.cancel = function() {
				inparams.location.path(inparams.root);
			};
		},
		Update: function (inparams) {
			if (inparams.paramid==undefined) {
				inparams.scope.save = function() {
					inparams.me.newItem(inparams.name,inparams.scope.item).then(function(data) {
						if (data.error){
							inparams.scope.$parent.ShowMessage(data.error.text);
						} else {
							inparams.location.path(inparams.root);
						}
					});
				};				
			} else {
				inparams.me.getItems(inparams.name).then(function (data) {
					inparams.scope.items=data;
					for (var i = 0; i < inparams.scope.items.length; i++) {
						if (inparams.scope.items[i].id == inparams.paramid) {
							inparams.scope.item = inparams.scope.items[i];
							break;
						}
					}
				});
			}

			inparams.scope.cancelUpdate = function() {
				inparams.location.path(inparams.root);
			};

			inparams.scope.destroy = function() {
				inparams.me.delItem(inparams.name,inparams.scope.item).then(function(data) {
					inparams.location.path(inparams.root);
				});
			};

			inparams.scope.save = function() {
				if (inparams.paramid==undefined) {
					inparams.me.newItem(inparams.name,inparams.scope.item).then(function(data) {
						if (data.error){
							inparams.scope.$parent.ShowMessage(data.error.text);
						} else {
							inparams.location.path(inparams.root);
						}
					});
				} else {
					inparams.me.updItem(inparams.name,inparams.scope.item).then(function(data) {
						if (data.error){
							inparams.scope.$parent.ShowMessage(data.error.text);
						} else {
							inparams.location.path(inparams.root);
						}
					});
				}
			};
		},			
		Values: function (inparams) {
			this.getItems(inparams.name).then(function (data) {
				inparams.scope.items=data;
			});
			inparams.scope.DataSaved=false;
			inparams.scope.showAlert  = function() {
				inparams.scope.DataSaved=true;
				$timeout(function(){
					inparams.scope.DataSaved=false;
				},2000);
			}		    
			inparams.scope.closeAlert = function() {
				inparams.scope.DataSaved=false;
			};	
			inparams.scope.save = function() {
				inparams.me.setValues(inparams.name,inparams.scope.items).then(function(data) {
					inparams.scope.showAlert();
				});
			};
		},
		setCalendar: function (scope,name,event) { 
			scope.openCalendar = function(name,event) {
				event.preventDefault();
				event.stopPropagation();
				angular.forEach(scope.opened, function(value, key) {
					scope.openedCalendars[key]=false;
				}, log);
				cope.openedCalendars[name] = true;
			}
		}

	};
})

.filter('datetimelocal', function($filter) {
	return function(dateString)
	{
		var timebits = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+-])([0-9]{2})([0-9]{2}))?/;
		var m = timebits.exec(dateString);
		var resultDate;
		if (m) {
			/*
		var utcdate = Date.UTC(parseInt(m[1]),
			parseInt(m[2])-1, // months are zero-offset (!)
			parseInt(m[3]),
			parseInt(m[4]), parseInt(m[5]), // hh:mm
			(m[6] && parseInt(m[6]) || 0),  // optional seconds
			(m[7] && parseFloat(m[7])*1000) || 0); // optional fraction
		// utcdate is milliseconds since the epoch
		
		if (m[9] && m[10]) {
		    var offsetMinutes = parseInt(m[9]) * 60 + parseInt(m[10]);
		    utcdate += (m[8] === '+' ? -1 : +1) * offsetMinutes * 60000;
		}
		resultDate = new Date(utcdate);
		*/
			resultDate = m[1]+'-'+m[2]+'-'+m[3]+'T'+m[4]+':'+m[5]+':'+m[6];
		} else {
			resultDate = null;
		}
		return resultDate;
	};
})

.config(function($routeProvider) {
	$routeProvider
		.when('/jedla', {
			controller:'MealsCtrl',
			templateUrl:'partials/meals.tpl.html'
		})
		.when('/jedlo/:id', {
			controller:'MealsCtrl',
			templateUrl:'partials/meal.tpl.html'
		})		
		.when('/jedlo', {
			controller:'MealsCtrl',
			templateUrl:'partials/meal.tpl.html'
		})		
		.when('/jedalnylistok', {
			controller:'FoodmenuCtrl',
			templateUrl:'partials/foodmenu.tpl.html'
		})

		
		.when('/nastavenia/pouzivatelia', {
			controller:'UsersCtrl',
			templateUrl:'partials/users.tpl.html'
		})
		.when('/nastavenia/pouzivatel/:id', {
			controller:'UsersCtrl',
			templateUrl:'partials/user.tpl.html'
		})		
		.when('/nastavenia/pouzivatel', {
			controller:'UsersCtrl',
			templateUrl:'partials/user.tpl.html'
		})		

		.when('/nastavenia/porcie', {
			controller:'SizesCtrl',
			templateUrl:'partials/sizes.tpl.html'
		})
		.when('/nastavenia/porcia/:id', {
			controller:'SizesCtrl',
			templateUrl:'partials/size.tpl.html'
		})		
		.when('/nastavenia/porcia', {
			controller:'SizesCtrl',
			templateUrl:'partials/size.tpl.html'
		})		

		.when('/nastavenia/typycien', {
			controller:'PricetypesCtrl',
			templateUrl:'partials/pricetypes.tpl.html'
		})
		.when('/nastavenia/typceny/:id', {
			controller:'PricetypesCtrl',
			templateUrl:'partials/pricetype.tpl.html'
		})		
		.when('/nastavenia/typceny', {
			controller:'PricetypesCtrl',
			templateUrl:'partials/pricetype.tpl.html'
		})		

		.when('/nastavenia/ingrediencie', {
			controller:'IngredientsCtrl',
			templateUrl:'partials/ingredients.tpl.html'
		})
		.when('/nastavenia/ingrediencia/:id', {
			controller:'IngredientsCtrl',
			templateUrl:'partials/ingredient.tpl.html'
		})		
		.when('/nastavenia/ingrediencia', {
			controller:'IngredientsCtrl',
			templateUrl:'partials/ingredient.tpl.html'
		})		

		.when('/nastavenia/alergeny', {
			controller:'AllergensCtrl',
			templateUrl:'partials/allergens.tpl.html'
		})
		.when('/nastavenia/alergen/:id', {
			controller:'AllergensCtrl',
			templateUrl:'partials/allergen.tpl.html'
		})		
		.when('/nastavenia/alergen', {
			controller:'AllergensCtrl',
			templateUrl:'partials/allergen.tpl.html'
		})		

		
		.when('/nastavenia/kategorie_jedal', {
			controller:'CategoryCtrl',
			templateUrl:'partials/categories.tpl.html'
		})
		.when('/nastavenia/kategoria/:id', {
			controller:'CategoryCtrl',
			templateUrl:'partials/category.tpl.html'
		})		
		.when('/nastavenia/kategoria', {
			controller:'CategoryCtrl',
			templateUrl:'partials/category.tpl.html'
		})		

		.when('/nastavenia/druhymenu', {
			controller:'MenusCtrl',
			templateUrl:'partials/menus.tpl.html'
		})
		.when('/nastavenia/menu/:id', {
			controller:'MenusCtrl',
			templateUrl:'partials/menu.tpl.html'
		})		
		.when('/nastavenia/menu', {
			controller:'MenusCtrl',
			templateUrl:'partials/menu.tpl.html'
		})		
		.when('/nastavenia', {
			redirectTo:'/nastavenia/druhymenu'
		})

		
		
		.otherwise({
			redirectTo:'/jedla'
		});
})

.controller('SubmenuCtrl', function ($scope, $location) {
	$scope.getClass = function (path) {
		if ($location.path().substr(0, path.length) == path) {
			return true
		} else {
			return false;
		}
	}
})

.controller('MainCtrl',function($scope, $timeout, $location, $routeParams, DataSet) {
	
	$scope.ShowMessage = function(msg) {
		$scope.showMessage=msg;
		if (msg) {
			$timeout(function(){
				$scope.showMessage="";
			},3000);
		}
	}
	$scope.ShowMessage("");
})

.controller('FoodmenuCtrl', function ($scope, $location, $routeParams, DataSet, $modal) {
	if (!$scope.$root.dateOptions) {
		$scope.$root.dateOptions = {
			formatYear: 'yyyy',
			startingDay: 1,
			initDate: new Date('01-01-1900')
			};
		$scope.$root.seldate = new Date();
	}
	
	$scope.menutypes=[];
	$scope.loadItems = function($id,loaddate){
		loaddate=loaddate.toISOString().substring(0, 10);
		DataSet.getItems('meals/'+$id+'/menu/'+loaddate ).then(function(data) {
			$scope.items=data;
		});
	}
	$scope.$watch('selmenutype', function(current, old){
		if ( old != current ) {
			$scope.loadItems(current,$scope.$root.seldate);
			$scope.$root.selmenutype=current;
		}
	});
	$scope.$watch('seldate', function(current, old){
		if ( old != current ) {
			$scope.loadItems($scope.$root.selmenutype,current);
			$scope.$root.seldate=current;
		}
	});

	DataSet.getItems('menulist').then(function(data) {
		$scope.menutypes=data;
		if ($scope.$root.selmenutype) {
			for (var i = 0; i < $scope.menutypes.length; i++) {
				if ($scope.menutypes[i].id==$scope.$root.selmenutype){
					$scope.selmenutype=$scope.menutypes[i].id;
					$scope.loadItems($scope.menutypes[i].id,$scope.$root.seldate);
					return;
				}
			}			
		} 
		$scope.selmenutype=$scope.menutypes[0].id;
		$scope.loadItems($scope.menutypes[0].id,$scope.$root.seldate);
	});
	
	$scope.openPriceDlg = function ($selitem) {
//		var curitems=Array.apply(this, $selitem.servings);
//		var curitem=Array.apply(this, $selitem);
		var modalInstance = $modal.open({
				templateUrl : 'SelectPriceListDlg.html',
				controller : 'PriceListDlgCtrl',
				size : 'lg',
				resolve : {
					params : function() {
						return {'selitem': $selitem, 'allitems': $selitem.servings,'dataset': DataSet,'scope': $scope}
					}
				}
			 });

	}
})

.controller('PriceListDlgCtrl', function ($scope, $modalInstance, params) {
	$scope.items = params.allitems;
	$scope.selitem = params.selitem;
	$scope.DataSet = params.dataset;
	$scope.parentscope = params.scope;
	
	$scope.dateOptions = {
			formatYear: 'yyyy',
			startingDay: 1,
			initDate: new Date('01-01-1900')
			};
	
	
	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	$scope.showPrices = function () {
		$scope.DataSet.updItem('fooodpor/prices',{'idfood': $scope.selitem.id,'lng': $scope.selitem.lng}).then(function(data) {
			$scope.items = data;
		})
	}
	
	$scope.savePriceDate = function(item){
		item.from = (typeof(item.from)=="string"?item.from:(new Date(item.from - (item.from.getTimezoneOffset() * 60000))).toISOString().substring(0,10));
		$scope.DataSet.updItem('fooodpor',{'id': item.id,'idfood': item.idfood,'idsize': item.idsize,'from': item.from,'price': item.price,'lng': item.lng}).then(function(data) {
			$scope.selitem.servings=data;
			$modalInstance.dismiss('cancel');
		})
	}
	$scope.newPriceDate = function(item){
		item.from = (typeof(item.from)=="string"?item.from:(new Date(item.from - (item.from.getTimezoneOffset() * 60000))).toISOString().substring(0,10));
		$scope.DataSet.newItem('fooodpor',{'id': item.id,'idfood': item.idfood,'idsize': item.idsize,'from': item.from,'price': item.price,'lng': item.lng}).then(function(data) {
			$scope.selitem.servings=data;
			$modalInstance.dismiss('cancel');
		})
	}
	$scope.deletePriceDate = function(item){
		$scope.DataSet.delItem('fooodpor',{'id': item.id,'idfood': item.idfood,'idsize': item.idsize,'lng': item.lng}).then(function(data) {
			$scope.selitem.servings=data;
			$modalInstance.dismiss('cancel');
		})		
	}
})


.controller('MealsCtrl', function ($scope, $location, $routeParams, DataSet, $modal) {
	$scope.categories=[];
	$scope.categorylist=[];
	
//	DataSet.List({name: 'meals',scope: $scope,root: '/jedla'});
	DataSet.Update({name: 'meals',scope: $scope,paramid: $routeParams.id,location: $location,root: '/jedla',me: DataSet});
	$scope.setFile = function(element){
		$scope.$apply(function($scope) {
			DataSet.newItem('picture/'+element.files[0].name,element.files[0]).then(function(data) {
				$scope.item.idmedia=data;
			});
		});
	}
	
	$scope.loadItems = function($id){
		DataSet.getItems('meals/'+$id+'/category').then(function(data) {
			$scope.items=data;
		});
	}

	$scope.$watch('selcategory', function(current, old){
		if ( old != current ) {
			$scope.loadItems(current);
			$scope.$root.selcategory=current;
		}
	});

	DataSet.getItems('categorylist').then(function(data) {
		$scope.categorylist=data.slice();
		data.unshift({id:0,lgname:'-- Všetky kategórie --'})
		$scope.categories=data;
		if ($scope.$root.selcategory) {
			for (var i = 0; i < $scope.categories.length; i++) {
				if ($scope.categories[i].id==$scope.$root.selcategory){
					$scope.selcategory=$scope.categories[i].id;
					$scope.loadItems($scope.categories[i].id);
					return;
				}
			}			
		} 
		$scope.selcategory=$scope.categories[0].id;
		$scope.loadItems($scope.categories[0].id);
	});
	
	$scope.openCategoryDlg = function ($selitem) {
		 var modalInstance = $modal.open({
			templateUrl : 'SelectListDlg.html',
			controller : 'CategoryDlgCtrl',
			size : 'sm',
			resolve : {
				items : function() {
					return {'title': 'Výber kategórií','selitem': $selitem, 'allitems': $scope.categorylist,'dataset': DataSet}
				}
			}
		 });
	}
	$scope.openPortionDlg = function ($selitem) {
		DataSet.getItems('sizes').then(function(data) {
		 var modalInstance = $modal.open({
				templateUrl : 'SelectListDlg.html',
				controller : 'PortionDlgCtrl',
				size : 'sm',
				resolve : {
					items : function() {
						return {'title': 'Výber porcií/množstva','selitem': $selitem, 'allitems': data,'dataset': DataSet}
					}
				}
			 });
		});
	}
	$scope.openIngredientDlg = function ($selitem) {
		DataSet.getItems('ingredients').then(function(data) {
		 var modalInstance = $modal.open({
				templateUrl : 'SelectItemsDlg.html',
				controller : 'IngredientDlgCtrl',
				size : '',
				resolve : {
					items : function() {
						return {'title': 'Výber ingrediencií','selitem': $selitem, 'allitems': data,'dataset': DataSet}
					}
				}
			 });
		});
	}
	$scope.openAllergenDlg = function ($selitem) {
		DataSet.getItems('allergens').then(function(data) {
		 var modalInstance = $modal.open({
				templateUrl : 'SelectList1Dlg.html',
				controller : 'AllergenDlgCtrl',
				size : '',
				resolve : {
					items : function() {
						return {'title': 'Výber alergénov','selitem': $selitem, 'allitems': data,'dataset': DataSet}
					}
				}
			 });
		});
	}
	$scope.deleteMeal = function(item){
		DataSet.delItem('meals',item).then(function(data) {
			DataSet.getItems('meals').then(function(data) {
				$scope.items=data;
			});
		});
	}
})

.controller('CategoryDlgCtrl', function ($scope, $modalInstance, items) {
	$scope.title = items.title;
	$scope.items = items.allitems;
	$scope.selitem = items.selitem;
	$scope.selitems = items.selitem.category;
	$scope.DataSet = items.dataset;

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	$scope.selItem = function (idcat) {
		$scope.DataSet.updItem('meals/setcat',{idfood: $scope.selitem.id,idcat: idcat,lng: $scope.selitem.lng}).then(function(data) {
			$scope.selitem.category = data;
			$scope.selitems = data
		});
	}
	$scope.getClass=function(sitems,sitm){
		var cls='btn-default';
		if( sitems ){ 
			for (var i = 0; i < sitems.length; i++) {
				if (sitems[i].idcat==sitm.id){
					cls='btn-primary';
					break;
				}
			}
		}
		return cls;
	};
})
.controller('PortionDlgCtrl', function ($scope, $modalInstance, items) {
	$scope.title = items.title;
	$scope.items = items.allitems;
	$scope.selitem = items.selitem;
	$scope.selitems = items.selitem.servings;
	$scope.DataSet = items.dataset;

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	$scope.selItem = function (idsize) {
		$scope.DataSet.updItem('meals/setpor',{idfood: $scope.selitem.id,idsize: idsize,lng: $scope.selitem.lng}).then(function(data) {
			$scope.selitem.servings = data;
			$scope.selitems = data
		});
	}
	$scope.getClass=function(sitems,sitm){
		var cls='btn-default';
		if( sitems ){ 
			for (var i = 0; i < sitems.length; i++) {
				if (sitems[i].idsize==sitm.id){
					cls='btn-primary';
					break;
				}
			}
		}
		return cls;
	};
})
.controller('IngredientDlgCtrl', function ($scope, $modalInstance, items) {
	$scope.title = items.title;
	$scope.items = items.allitems;
	$scope.selitem = items.selitem;
	$scope.selitems = items.selitem.ingredients;
	$scope.DataSet = items.dataset;

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	$scope.selItem = function (iding) {
		$scope.DataSet.updItem('meals/seting',{idfood: $scope.selitem.id,iding: iding,lng: $scope.selitem.lng}).then(function(data) {
			$scope.selitem.ingredients = data;
			$scope.selitems = data
		});
	}
	$scope.getClass=function(sitems,sitm){
		var cls='btn-default';
		if( sitems ){ 
			for (var i = 0; i < sitems.length; i++) {
				if (sitems[i].iding==sitm.id){
					cls='btn-primary';
					break;
				}
			}
		}
		return cls;
	};
})

.controller('AllergenDlgCtrl', function ($scope, $modalInstance, items) {
	$scope.title = items.title;
	$scope.items = items.allitems;
	$scope.selitem = items.selitem;
	$scope.selitems = items.selitem.allergens;
	$scope.DataSet = items.dataset;

	$scope.cancel = function () {
		$modalInstance.dismiss('cancel');
	};
	$scope.selItem = function (idallerg) {
		$scope.DataSet.updItem('meals/setallergen',{idfood: $scope.selitem.id,idallerg: idallerg,lng: $scope.selitem.lng}).then(function(data) {
			$scope.selitem.allergens = data;
			$scope.selitems = data
		});
	}
	$scope.getClass=function(sitems,sitm){
		var cls='btn-default';
		if( sitems ){ 
			for (var i = 0; i < sitems.length; i++) {
				if (sitems[i].idallerg==sitm.id){
					cls='btn-primary';
					break;
				}
			}
		}
		return cls;
	};
})



.controller('UsersCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'users',scope: $scope,root: '/nastavenia/pouzivatelia'});
	DataSet.Update({name: 'users',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/pouzivatelia',me: DataSet});
})
.controller('SizesCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'sizes',scope: $scope,root: '/nastavenia/porcie'});
	DataSet.Update({name: 'sizes',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/porcie',me: DataSet});
})
.controller('PricetypesCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'pricetypes',scope: $scope,root: '/nastavenia/typycien'});
	DataSet.Update({name: 'pricetypes',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/typycien',me: DataSet});
})
.controller('IngredientsCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'ingredients',scope: $scope,root: '/nastavenia/ingrediencie'});
	DataSet.Update({name: 'ingredients',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/ingrediencie',me: DataSet});
})
.controller('AllergensCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'allergens',scope: $scope,root: '/nastavenia/alergeny'});
	DataSet.Update({name: 'allergens',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/alergeny',me: DataSet});
})
.controller('CategoryCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'category',scope: $scope,root: '/nastavenia/kategorie_jedal'});
	DataSet.Update({name: 'category',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/kategorie_jedal',me: DataSet});
	$scope.setFile = function(element){
		$scope.$apply(function($scope) {
			DataSet.newItem('picture/'+element.files[0].name,element.files[0]).then(function(data) {
				$scope.item.idmedia=data;
			});
		});
	}
	$scope.menutypes=[];
	DataSet.getItems('menus').then(function(data) {
		$scope.menutypes=data;
	});
})
.controller('MenusCtrl', function ($scope, $location, $routeParams, DataSet) {
	DataSet.List({name: 'menus',scope: $scope,root: '/nastavenia/druhymenu'});
	DataSet.Update({name: 'menus',scope: $scope,paramid: $routeParams.id,location: $location,root: '/nastavenia/druhymenu',me: DataSet});
	$scope.setFile = function(element){
		$scope.$apply(function($scope) {
			DataSet.newItem('picture/'+element.files[0].name,element.files[0]).then(function(data) {
				$scope.item.idmedia=data;
			});
		});
	}
})

.filter("mena",function(numberFilter) {
	function isNumeric(value) {
		return (!isNaN(parseFloat(value)) && isFinite(value));
	}

	return function(inputNumber, currencySymbol,decimalSeparator, thousandsSeparator, decimalDigits) {
		if (isNumeric(inputNumber)) {
			// Default values for the optional arguments
			currencySymbol = (typeof currencySymbol === "undefined") ? "€" : currencySymbol;
			decimalSeparator = (typeof decimalSeparator === "undefined") ? "," : decimalSeparator;
			thousandsSeparator = (typeof thousandsSeparator === "undefined") ? " " : thousandsSeparator;
			decimalDigits = (typeof decimalDigits === "undefined" || !isNumeric(decimalDigits)) ? 2 : decimalDigits;

			if (decimalDigits < 0)
				decimalDigits = 0;

			// Format the input number through the number filter
			// The resulting number will have "," as a thousands
			// separator
			// and "." as a decimal separator.
			var formattedNumber = numberFilter(inputNumber,
					decimalDigits);

			// Extract the integral and the decimal parts
			var numberParts = formattedNumber.split(".");

			// Replace the "," symbol in the integral part
			// with the specified thousands separator.
			numberParts[0] = numberParts[0].split(",").join(
					thousandsSeparator);

			// Compose the final result
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
