<?php 
define('APIROOT','api/');
require_once 'api/prolog.php'; 
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
	<head>
		<title>FoodMenu</title>
<!-- 		<meta name="viewport" content="initial-scale=1, maximum-scale=1" /> -->
		<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
		<meta charset="utf-8" />
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/angular-material/0.9.0/angular-material.css">
		<link rel="stylesheet" href="css/app.css">
<!-- 		<link rel="stylesheet" href="css/zoom.css"> -->
	</head>
<body md-theme="blue" layout="row" layout-fill ng-controller="AppCtrl" ng-keydown="pressKey($event)"> 
	<md-sidenav layout="column" layout-fill class="md-sidenav-left md-whiteframe-z2" md-component-id="left" md-is-locked-open="$mdMedia('gt-md')">
		<md-toolbar>
			<div layout-fill layout="row" class="md-toolbar-tools">
				<a ng-href="#/" layout="row" flex> 					
					<h3>Ponuka</h3>
				</a>
			</div>
		</md-toolbar>
		<md-content>
			<ul class="docs-menu" style="display: none">
				<li ng-repeat="section in menu.sections" class="parent-list-item"
					ng-class="{'parentActive' : isSectionSelected(section)}">
					<h2 class="menu-heading" ng-if="section.type === 'heading'"
						id="heading_{{ section.name | nospace }}">{{section.name}}</h2>
						<div ng-switch="section.type"> 
							<menu-link section="section" ng-switch-when="link"></menu-link> 
							<menu-subheader section="section" ng-switch-when="subheader"></menu-subheader>
							<menu-toggle section="section" ng-switch-when="toggle"></menu-toggle>
							<menu-radio section="section" ng-switch-when="radio"></menu-radio>
							<menu-check section="section" ng-switch-when="check"></menu-check>
						</div>
						<ul ng-if="section.children" class="menu-nested-list">
							<li ng-repeat="child in section.children" ng-class="{'childActive' : isSectionSelected(child)}">
								<menu-toggle section="child"></menu-toggle>
							</li>
						</ul>
					
				</li>
			</ul>
		</md-content>
	</md-sidenav>

	<div flex layout="column">
		<md-toolbar>
			<div id="page-header" class="md-toolbar-tools" ng-show="!detailDisplayed">
<!-- 				<img class="logo" hide-md src="img/logo.svg"> -->
				
				<md-button ng-click="toggleSidenav('left')" hide-gt-md aria-label="Menu"> 
					<ng-md-icon icon="menu"></ng-md-icon>
				</md-button>
		
				<div layout="row" layout-fill>				
					<a ng-href="#/"> 					
						<h1 flex="66" class="docs-headitem" style="display: none">
							{{menu.currentPage.name}}
						</h1>
					</a>
	
					<span flex></span>
					

					<md-input-container class="docs-headitem" style="display: none">
						<input id="SearchText_{{showSearchIcon}}" ng-class="SearchText" type="text" aria-label="Vyhľadať" 
						ng-model="searchtext" ng-keypress="" />
					</md-input-container>					
					<md-button aria-label="Search" ng-click="showSearchToggle()">
						<ng-md-icon icon="{{showSearchIcon}}" options="{{showSearchOptions}}"></ng-md-icon> 
					</md-button>
				</div>
	
			</div>
			
			
			
			
			
			
			<div id="page-detail-header" class="md-toolbar-tools" ng-show="detailDisplayed" md-scroll-shrink="true" md-shrink-speed-factor="0.25" >
				<md-button class="md-tools" aria-label="Návrat" ng-click="showDetail()">
					<ng-md-icon icon="arrow_back"></ng-md-icon>
					<md-tooltip class="apltooltip">Návrat</md-tooltip>
				</md-button>	
				<h2 md-header-title>{{detailTitle}}</h2>
<!-- 				<md-button class="md-tools" aria-label="Edit Contact"><i class="ion-android-create"></i></md-button> -->
<!-- 				<md-button class="md-tools" aria-label="More"><i class="ion-android-more-vertical"></i></md-button> -->
			</div>
						
			
			
			
		</md-toolbar>
		<md-content id="page-view" ng-view md-scroll-y role="main" flex style="overflow-y: scroll;"></md-content>
	</div>



	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0-rc.2/angular.js"></script>
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0-rc.2/angular-animate.js"></script>
	<script	src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0-rc.2/angular-aria.js"></script>
<!-- 		<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0-rc.2/angular-route.min.js"></script> -->
	<script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.0-rc.2/angular-route.js"></script>
<!-- 		<script	src="https://cdnjs.cloudflare.com/ajax/libs/angular-material/0.8.3/angular-material.min.js"></script> -->
	
	
<!-- 	<script src="https://ajax.googleapis.com/ajax/libs/angular_material/0.9.0/angular-material.min.js"></script> -->
	<script src="https://ajax.googleapis.com/ajax/libs/angular_material/0.9.0/angular-material.js"></script>
	
	<script	src="http://cdn.jsdelivr.net/angular-material-icons/0.4.0/angular-material-icons.min.js"></script>
	<script src="http://cdnjs.cloudflare.com/ajax/libs/SVG-Morpheus/0.1.8/svg-morpheus.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/svg.js/1.0.1/svg.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/1.17.0/TweenMax.min.js"></script>
<!-- 	<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/1.17.0/TweenLite.min.js"></script> -->
	<script src="js/timelines.js"></script>
	<script src="js/app.js"></script>
</body>
</html>