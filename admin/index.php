<?php 
define('APIROOT','../api/');
require_once '../api/prolog.php'; 
?>
<!doctype html>
<html lang="sk" ng-app="app">
<head>
<title>FoodMenu</title>
<meta charset="utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="">

<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.js"></script>
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-route.min.js"></script>
<script type="text/javascript" src='https://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-sanitize.min.js'></script>

<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/0.13.0/ui-bootstrap.min.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/0.13.0/ui-bootstrap-tpls.min.js"></script>
<script type="text/javascript" src='http://cdnjs.cloudflare.com/ajax/libs/textAngular/1.1.2/textAngular.min.js'></script>

<link rel='stylesheet prefetch' href='http://netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.min.css'>
<link rel='stylesheet prefetch' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css'>

<link rel="stylesheet" href="css/admin.css">
</head>
<body data-ng-controller="MainCtrl" data-ng-init="showMessage='';">
<?php if (!array_key_exists("applogged",$_SESSION)) { ?>
	<div class="container">
		<br /><br />
		<form class="form-login" action="./" method="post">
			<h2 class="form-login-heading">Administrácia</h2>
			<input type="hidden" name="ac" value="log">
			<label for="inputEmail" class="sr-only">Používateľ</label> 
			<input name="usr" type="text" id="usr" class="form-control" placeholder="Používateľ" autofocus> 
			<label for="inputPassword" class="sr-only">Heslo</label> 
			<input name="pwd" type="password" id="pwd" class="form-control" placeholder="Heslo">
			<button class="btn btn-lg btn-primary btn-block" type="submit">Prihlásiť sa</button>
		</form>
	</div>


<?php } else { ?>
<nav class="navbar navbar-inverse navbar-fixed-top" role="navigation">
		<div class="navbar-inner">
			<div class="container">
				<div class="navbar-header">
					<div class="navbar-toggle" data-toggle="collapse"
						data-target=".navbar-collapse">
							<form action="./" method="post">
								<input type="hidden" name="ac" value="exit">
								<button type="submit" 
								tooltip="Odhlásiť sa" tooltip-placement="bottom"
								class="btn btn-danger btn-xs" style="margin:0;"><i class="glyphicon glyphicon-off"></i></button>
							</form>
					</div>
				
					<div class="navbar-toggle" data-toggle="collapse"
						data-target=".navbar-collapse">
						<a href="#/nastavenia" tooltip="Nastavenia programu"
							tooltip-placement="bottom"><i class="glyphicon glyphicon-cog"></i></a>
					</div>
<!-- 					<div class="navbar-toggle" data-toggle="collapse" -->
<!-- 						data-target=".navbar-collapse"> -->
<!-- 						<a href="#/smss" tooltip="Objednávky jedál" -->
<!-- 							tooltip-placement="bottom"><i class="glyphicon glyphicon-calendar"></i></a> -->
<!-- 					</div> -->
					<div class="navbar-toggle" data-toggle="collapse"
						data-target=".navbar-collapse">
						<a href="#/jedla" tooltip="Jedlá v ponuke"
							tooltip-placement="bottom"><i
							class="glyphicon glyphicon-th-list"></i></a>
					</div>
					<div class="navbar-toggle" data-toggle="collapse"
						data-target=".navbar-collapse">
						<a href="#/jedalnylistok" tooltip="Jedálny lístok"
							tooltip-placement="bottom"><i
							class="glyphicon glyphicon-list-alt"></i></a>
					</div>
<!-- 					<div class="navbar-toggle" data-toggle="collapse" -->
<!-- 						data-target=".navbar-collapse"> -->
<!-- 						<a href="#/ticets" tooltip="Obedové a iné menu" -->
<!-- 							tooltip-placement="bottom"><i -->
<!-- 							class="glyphicon glyphicon-calendar"></i></a> -->
<!-- 					</div> -->
					
					<a class="navbar-brand" href="#/"><i
						class="glyphicon glyphicon-cutlery" aria-hidden="true"></i> FoodMenu
					</a>
				</div>
				<div class="collapse navbar-collapse">
					<ul class="nav navbar-nav pull-right">
<!-- 						<li><a href="#/tics" tooltip="Obedové a iné menu" -->
<!-- 							tooltip-placement="bottom"><i -->
<!-- 								class="glyphicon glyphicon-calendar"></i> Dené menu</a></li> -->
								
						<li><a href="#/jedalnylistok" tooltip="Jedálny lístok"
							tooltip-placement="bottom"><i
								class="glyphicon glyphicon-list-alt"></i> Ponuka</a></li>
								
						<li><a href="#/emls" tooltip="Jedlá v ponuke"
							tooltip-placement="bottom"><i
								class="glyphicon glyphicon-th-list"></i> Jedlá</a></li>
<!-- 						<li><a href="#/smss" tooltip="Objednávky jedál" -->
<!-- 							tooltip-placement="bottom"><i class="glyphicon glyphicon-calendar"></i> -->
<!-- 								Objednávky</a></li> -->
						<li><a href="#/nastavenia" tooltip="Nastavenia programu"
							tooltip-placement="bottom"><i class="glyphicon glyphicon-cog"></i>
								Nastavenia</a></li>
						<li>
							<form action="./" method="post">
								<input type="hidden" name="ac" value="exit">
								<button type="submit" 
								tooltip="Odhlásiť sa" tooltip-placement="bottom"
								class="btn btn-danger btn-xs" style="margin-top:13px;"><i class="glyphicon glyphicon-off"></i></button>
							</form>
						</li>
					</ul>
				</div>
			</div>			
		</div>
	</nav>
	<div class="container">
		<br />
		<br />
		<div ng-view></div>
		<div class="alert alert-success" role="alert"
			data-ng-show="showMessage">
			<button type="button" class="close" data-dismiss="alert"
				aria-label="Close" data-ng-click="DataSaved=false;">
				<span aria-hidden="true">&times;</span>
			</button>
			{{showMessage}}
		</div>
	</div>
<?php } ?>
<!-- 	<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js"></script> -->
<!-- 	<script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/js/bootstrap.min.js"></script> -->

	<script src="js/admin.js"></script>
</body>
</html>