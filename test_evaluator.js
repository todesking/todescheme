if (typeof(dojo) != 'undefined') { dojo.require('MochiKit.Logging'); }
if (typeof(JSAN) != 'undefined') { JSAN.use('MochiKit.Logging'); }
if (typeof(tests) == 'undefined') { tests = {}; }

tests.test_evaluator = function (t) {
	//environment
	var e=new Environment(null);
	var x='x';
	var y='y';
	t.is(e.defined(x),false,'env_defined not');
	e.bind(x,100);
	t.is(e.defined(x),true,'env_defined');
	t.is(e.lookup(x),100,'env_lookup');
	e.bind(y,2000);

	var e2=new Environment(e);
	e2.bind(x,1000);
	t.is(e2.defined(y),true,'env_parent');
	t.is(e2.lookup(y),2000,'env_parent lu');
	t.is(e2.defined(x),true,'env_override');
	t.is(e2.lookup(x),1000,'env_override lu');
	e2.set(x,10);
	t.is(e2.lookup(x),10,'env_set');
	t.is(e.lookup(x),100,'env_set noeffect in parent');
	e2.set(y,2);
	t.is(e.lookup(y),2,'env_set parent');
	t.is(e2.lookup(y),2,'env_set parent refer child');


	//inspect assembly
	var ia=Scheme.inspectAssembly;
	t.is(ia(['const',100,['halt']]),"['const', 100, ['halt']]",'insasm');

	//compiler
	var sp=Scheme.parse;
	var cp=function(e){return Scheme.compile(e).inspect()};
	t.is(cp(100),"['const', 100, ['halt']]",'asm const');
	t.is(cp(new Symbol('x')),"['ref', 'x', ['halt']]",'asm ref');
	t.is(cp(new Cons(new Symbol('x'),null)),"['push', ['halt'], ['apply-ref', 'x']]",'asm apply');
	t.is(cp(sp('((lambda () 1 (g) (f)))')),"['push', ['halt'], ['lambda-noparams', ['clearargs', ['const', 1, ['push', ['apply-ref', 'f'], ['apply-ref', 'g']]]], ['apply']]]",'asm tailcall');

	//evaluator
	t.is(!!Scheme.getDefaultEnvironment(),true,'env defaultenvironment exists');
	var env=new Environment(Scheme.getDefaultEnvironment());
	Scheme.test_env=env;
	t.is(env.defined('+'),true,'env defaultenvironment +');
	env.bind('x',100);
	env.bind('y',200);
	var ev=function(e){return Scheme.evaluate(e,env)} //parse & eval
	var evi=function(e){return Scheme.inspectSExpr(ev(e))} //ev & inspect sexpr

	//const
	t.is(ev(2),2,'eval int');
	t.is(ev("string"),"string",'eval str');

	//var ref
	t.is(ev(new Symbol('x')),100,'eval varref');

	//define
	t.is(env.defined('z'),false,'eval define pre');
	ev(sp('(define z 500)'));
	t.is(env.defined('z'),true,'eval define');
	t.is(env.lookup('z'),500,'eval define');

	//numeric
	t.is(evi(sp('+')),'#<js function>','eval add pre');
	t.is(ev(sp('(+ 1 2)')),3,'eval add');
	t.is(ev(sp('(+ 10 5 1)')),16,'eval add3');
	t.is(ev(sp('(+ (+ 1 2) (+ 1 2 3 4))')),13,'eval complex add');
	t.is(ev(sp('(> 1 2)')),false,'eval >');
	t.is(ev(sp('(< 1 2)')),true,'eval <');
	t.is(ev(sp('(= 1 2)')),false,'eval =');

	//procs
	t.is(evi(sp('(list 4 6 7)')),'(4 6 7 )','func list');

	//syntax
	t.is(ev(sp('(quote 100)')),100,'quote const');
	t.is(evi(sp('(quote (f))')),'(f )','quote (f)');
	t.is(evi(sp('(quote (list a b c))')),'(list a b c )','quote (list a b c)');

	t.is(ev(sp('(if () 1 "hoge")')),'hoge','if test f');
	t.is(ev(sp('(if 100 1 "hoge")')),1,'if test t');
	env.bind('x',50);
	t.is(evi(sp('(if (< x 100) (list 1 2 (+ 1 2) (quote (a b c))) "hoge")')),'(1 2 3 (a b c ) )','complex syntax test');
	env.bind('x',150);
	t.is(evi(sp('(if (< x 100) (list 1 2 (+ 1 2) (quote (a b c))) "hoge")')),'\"hoge\"','complex syntax test2');

	t.is(ev(sp('((lambda () 1))')),1,'eval non-param lambda apply');
	t.is(ev(sp('((lambda (a b c) b) 10 20 30)')),20,'eval lambda with params');
	t.is(ev(sp('(((lambda (a b) (lambda (x) (+ a b x))) 1 2) 3)')),6,'eval complex lambda');
	t.is(ev(sp('( (lambda (a) (+ ((lambda () 1 (set! a 10) 2 3)) a)) 0)')),13,'eval multi-body lambda'); 

	ev(sp('(define foo 100)'));
	t.is(ev(sp('foo')),100,'set test pre');
	ev(sp('(set! foo 10)'));
	t.is(ev(sp('foo')),10,'set test post');

	t.is(evi(sp('((lambda (a) ((lambda (x y) (set! x (+ 1 x)) (list a x y)) a a)) 10)')),'(10 11 10 )','set! and lambda');
	t.is(evi(sp('((lambda (a) ((lambda (x y) (set! a (+ 1 x)) (list a x y)) a a)) 10)')),'(11 10 10 )','set! and lambda2');


	//lambda (complex)
	ev(sp('(define create-counter (lambda (count) (lambda () (set! count (+ count 1)) count)))'));
	ev(sp('(define incr1 (create-counter 0))'));
	ev(sp('(define incr2 (create-counter 100))'));
	t.is(ev(sp('(incr1)')),1,'incr1-1');
	t.is(ev(sp('(incr2)')),101,'incr2-1');
	t.is(ev(sp('(incr1)')),2,'incr1-2');
	t.is(ev(sp('(incr2)')),102,'incr2-2');
	t.is(ev(sp('(incr1)')),3,'incr1-3');

	//call/cc
	t.is(ev(sp('(call/cc (lambda(cc) (cc 100)))')),100);
	t.is(evi(sp('(list 1 (call/cc (lambda (cc) (cc 2))) 3)')),'(1 2 3 )','call/cc by yhara');
	ev(sp('(define cont 0)'));
	t.is(ev(sp('(+ 1 2 (call/cc (lambda (c) (set! cont c) 3)))')),6,'call/cc save');
	t.is(ev(sp('(cont 4)')),7,'call/cc invoke 1');
	t.is(ev(sp('(cont 10)')),13,'call/cc invoke 2');
	t.is(ev(sp('(cont 0)')),3,'call/cc invoke 3');
	t.is(ev(sp('(list 100 200 (cont 1))')),4,'call/cc invoke in another frame');
	t.is(ev(sp('((lambda () (cont 1) (set! cont 0)))')),4,'call/cc invoke in another frame 2');
	t.is(env.lookup('cont').isContinuation,true,'call/cc invoke after test');

	//eval
	ev=function(expr) { return Scheme.evaluate(new Cons(new Symbol('evalu'),new Cons(new Cons(new Symbol('quote'),new Cons(expr,null)),new Cons(env,null))),env) }

	//numeric
	t.is(evi(sp('+')),'#<js function>','eval add pre');
	t.is(ev(sp('(+ 1 2)')),3,'eval add');
	t.is(ev(sp('(+ 10 5 1)')),16,'eval add3');
	t.is(ev(sp('(+ (+ 1 2) (+ 1 2 3 4))')),13,'eval complex add');
	t.is(ev(sp('(> 1 2)')),false,'eval >');
	t.is(ev(sp('(< 1 2)')),true,'eval <');
	t.is(ev(sp('(= 1 2)')),false,'eval =');

	//procs
	t.is(evi(sp('(list 4 6 7)')),'(4 6 7 )','func list');

	//syntax
	t.is(ev(sp('(quote 100)')),100,'quote const');
	t.is(evi(sp('(quote (f))')),'(f )','quote (f)');
	t.is(evi(sp('(quote (list a b c))')),'(list a b c )','quote (list a b c)');

	t.is(ev(sp('(if () 1 "hoge")')),'hoge','if test f');
	t.is(ev(sp('(if 100 1 "hoge")')),1,'if test t');
	env.bind('x',50);
	t.is(evi(sp('(if (< x 100) (list 1 2 (+ 1 2) (quote (a b c))) "hoge")')),'(1 2 3 (a b c ) )','complex syntax test');
	env.bind('x',150);
	t.is(evi(sp('(if (< x 100) (list 1 2 (+ 1 2) (quote (a b c))) "hoge")')),'\"hoge\"','complex syntax test2');

	t.is(ev(sp('((lambda () 1))')),1,'eval non-param lambda apply');
	t.is(ev(sp('((lambda (a b c) b) 10 20 30)')),20,'eval lambda with params');
	t.is(ev(sp('(((lambda (a b) (lambda (x) (+ a b x))) 1 2) 3)')),6,'eval complex lambda');
	t.is(ev(sp('( (lambda (a) (+ ((lambda () 1 (set! a 10) 2 3)) a)) 0)')),13,'eval multi-body lambda'); 

	ev(sp('(define foo 100)'));
	t.is(ev(sp('foo')),100,'set test pre');
	ev(sp('(set! foo 10)'));
	t.is(ev(sp('foo')),10,'set test post');

	t.is(evi(sp('((lambda (a) ((lambda (x y) (set! x (+ 1 x)) (list a x y)) a a)) 10)')),'(10 11 10 )','set! and lambda');
	t.is(evi(sp('((lambda (a) ((lambda (x y) (set! a (+ 1 x)) (list a x y)) a a)) 10)')),'(11 10 10 )','set! and lambda2');


	//lambda (complex)
	ev(sp('(define create-counter (lambda (count) (lambda () (set! count (+ count 1)) count)))'));
	ev(sp('(define incr1 (create-counter 0))'));
	ev(sp('(define incr2 (create-counter 100))'));
	t.is(ev(sp('(incr1)')),1,'incr1-1');
	t.is(ev(sp('(incr2)')),101,'incr2-1');
	t.is(ev(sp('(incr1)')),2,'incr1-2');
	t.is(ev(sp('(incr2)')),102,'incr2-2');
	t.is(ev(sp('(incr1)')),3,'incr1-3');

	//call/cc
	t.is(ev(sp('(call/cc (lambda(cc) (cc 100)))')),100);
	t.is(evi(sp('(list 1 (call/cc (lambda (cc) (cc 2))) 3)')),'(1 2 3 )','call/cc by yhara');
	ev(sp('(define cont 0)'));
	t.is(ev(sp('(+ 1 2 (call/cc (lambda (c) (set! cont c) 3)))')),6,'call/cc save');
	t.is(ev(sp('(cont 4)')),7,'call/cc invoke 1');
	t.is(ev(sp('(cont 10)')),13,'call/cc invoke 2');
	t.is(ev(sp('(cont 0)')),3,'call/cc invoke 3');
	t.is(ev(sp('(list 100 200 (cont 1))')),4,'call/cc invoke in another frame');
	t.is(ev(sp('((lambda () (cont 1) (set! cont 0)))')),4,'call/cc invoke in another frame 2');
	t.is(env.lookup('cont').isContinuation,true,'call/cc invoke after test');
};
