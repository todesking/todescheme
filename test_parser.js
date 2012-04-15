if (typeof(dojo) != 'undefined') { dojo.require('MochiKit.Logging'); }
if (typeof(JSAN) != 'undefined') { JSAN.use('MochiKit.Logging'); }
if (typeof(tests) == 'undefined') { tests = {}; }

tests.test_inspect = function (t) {
	//inspect
	t.is(Scheme.inspectSExpr(null),'()','()');
	t.is(Scheme.inspectSExpr(void(0)),'undefined','undef');
	t.is(Scheme.inspectSExpr('string'),'"string"','str');
	t.is(Scheme.inspectSExpr(new Symbol('symsym')),'symsym','sym');
	t.is(Scheme.inspectSExpr(new Cons(1,new Cons(2,null))),'(1 2 )','cons(proper list)')
	t.is(Scheme.inspectSExpr(new Cons(1,new Cons(2,new Cons(3,4)))),'(1 2 3 . 4)','cons(improper list)')
	t.is(Scheme.inspectSExpr(new Cons(null,new Cons(2,null))),'(() 2 )','cons')
	t.is(Scheme.inspectSExpr(new Cons(null,new Cons(2,void(0)))),'(() 2 . undefined)','cons')
};
tests.test_parse=function(t) {
	//parse
	var ps=function(str){return Scheme.inspectSExpr(Scheme.parse(str))} //parsed sexpr string
	t.is(Scheme.parse('()'),null,'p-nil')
	t.is(Scheme.parse('1'),1,'p-int');
	t.is(Scheme.parse('"parse string"'),'parse string','p-str');
	t.is(Scheme.parse('$sym_bol**+-+'),'$sym_bol**+-+','p-str specialchar');
	t.is(typeof(Scheme.parse('"parse string2"')),'string','p-str type');
	t.is(Scheme.parse('parse_symbol'),'parse_symbol','p-sym');
	t.is(Scheme.parse('parse_symbol').isSymbol,true,'p-sym isSymbol');
	t.is(ps('()'),'()','nil');
	t.is(ps('100'),'100','int');
	t.is(ps('"string"'),'"string"','str');
	t.is(ps('symbol'),'symbol','sym');
	t.is(ps('(1 2 3)'),'(1 2 3 )','prop list');
	t.is(ps('(1 (1 2 3) a b () (x (y z)))'),'(1 (1 2 3 ) a b () (x (y z ) ) )','nested list');
	// ToDo: t.is(ps("'(1 2 3)"),"(quote 1 2 3 )",'quote');
};
