function activeTab(tab)
{
    document.getElementById('main').setAttribute('class', 'hidden');
    document.getElementById('truevalues').setAttribute('class', 'hidden');
    document.getElementById('norForm').setAttribute('class', 'hidden');
    document.getElementById('tree').setAttribute('class', 'hidden');
    document.getElementById(tab).setAttribute('class', '');
}

operList = ["!", "&", "|", "^", "~"];

function convertExpr(source) {
    if (checkInvalid(source)) {
        document.getElementById('preexp').value = "Invalid Expression";
        document.getElementById('postexp').value = "Error Code: " + checkInvalid(source);
        document.getElementById('tvtable').innerText = "";
        return;
    }

    var result = addBracket(source);
    preexp = simplizeExpr(moveOperatorPre(result));
    document.getElementById('preexp').value = preexp;
    document.getElementById('postexp').value = simplizeExpr(moveOperatorPost(result));

    var tvTable = calcExprTable(preexp);
    var tvtText = tvTable.valname.join('\t') + '\t' + source;
    for (var i = 0; i < 2 << (tvTable.valname.length - 1) ; i++)
        tvtText += '\n' + ("0".repeat(tvTable.valname.length - i.toString(2).length) + i.toString(2)).replace(/(.)/g, "$1\t") + tvTable.expval[i];
    document.getElementById('tvtable').innerText = tvtText;
    
    var conjForm = [];
    var disjForm = [];
    for (var i = 0; i < 2 << (tvTable.valname.length - 1) ; i++) {
        var repValList = tvTable.valname.slice(0);
        if (tvTable.expval[i]) {
            for (var j = 0; j < tvTable.valname.length; j++)
                if(!((i >> tvTable.valname.length - 1 - j) & 1))
                    repValList[j] = "!" + repValList[j];
            disjForm.push(repValList.join("&"));
        } else {
            for (var j = 0; j < tvTable.valname.length; j++)
                if ((i >> tvTable.valname.length - 1 - j) & 1)
                    repValList[j] = "!" + repValList[j];
            conjForm.push("(" + repValList.join("|") + ")");
        }
    }
    if (conjForm.length > 0)
        conjForm = conjForm.join("&");
    else
        conjForm = "\u25A1";
    if (disjForm.length > 0)
        disjForm = disjForm.join("|");
    else
        disjForm = "\u25A1";
    document.getElementById('norForm').innerText = "主合取范式：" + conjForm + "\n\n主析取范式：" + disjForm;

    drawTree();
}

function checkInvalid(source) {
    if (source.match(/[^A-Za-z\(\)!&|^~]/))  // Invalid characters
        return 1;
    var bracketCount = 0;
    for (var i = 0; i < source.length; i++) {
        if (source.charAt(i) == '(')
            bracketCount++;
        else if (source.charAt(i) == ')')
            bracketCount--;
        if (bracketCount < 0)
            return 2;
    }
    if (bracketCount)  // Bracket does not match
        return 2;
    if (source.match(/[^\w\(\)]$/) || source.match(/^[^\w!\(\)]/))  // Invalid operator position
        return 3;
    if (source.match(/[^\w\(\)][^!\w\(\)]/) || source.match(/[^\w\)][^!\w\(]/))  // Invalid operator position
        return 3;
    if (source.match(/[\w\)][\w\(!]/))  // Proximate subexpresion
        return 4;
}

function addBracket(source) {
    for (var i = source.length - 1; i >= 0; i--) {
        if (source.charAt(i) == operList[0]) {
            var exprLength = findNextExpr(source.slice(i + 1));
            source = source.slice(0, i) + "(" + source.slice(i, i + exprLength + 1) + ")" + source.slice(i + exprLength + 1);
            i++;
        }
    }
    for (var k = 1; k < operList.length; k++)
        for (var i = 0; i < source.length; i++) {
            if (source.charAt(i) == operList[k]) {
                var prevExprLength = findPrevExpr(source.slice(0, i));
                var nextExprLength = findNextExpr(source.slice(i + 1));
                source = source.slice(0, i - prevExprLength) + "(" + source.slice(i - prevExprLength, i + nextExprLength + 1) + ")" + source.slice(i + nextExprLength + 1);
                i++;
            }
        }
    return source;
}

function findPrevExpr(source) {
    var bracketCount = 0;
    for (var i = source.length - 1; i >= 0; i--) {
        if (source.charAt(i) == '(')
            bracketCount--;
        else if (source.charAt(i) == ')')
            bracketCount++;
        if (bracketCount == 0)
            return source.length - i;
    }
}

function findNextExpr(source) {
    var bracketCount = 0;
    if (!source.charAt(0).match(/\(|\w/))
        return 0;
    for (var i = 0; i < source.length; i++) {
        if (source.charAt(i) == '(')
            bracketCount++;
        else if (source.charAt(i) == ')')
            bracketCount--;
        if (bracketCount == 0)
            return i + 1;
    }
}

function moveOperatorPre(source) {
    if (source.search(/^\(/) == -1)
        return source;
    var source = source.slice(1, -1);
    var operPos = findNextExpr(source);
    if (operPos == source.length)
        return moveOperatorPre(source);
    return source.charAt(operPos) + moveOperatorPre(source.slice(0, operPos)) + " " + moveOperatorPre(source.slice(operPos + 1));
}

function moveOperatorPost(source) {
    if (source.search(/^\(/) == -1)
        return source;
    source = source.slice(1, -1);
    var operPos = findNextExpr(source);
    if (operPos == source.length)
        return moveOperatorPost(source);
    return moveOperatorPost(source.slice(0, operPos)) + " " + moveOperatorPost(source.slice(operPos + 1)) + source.charAt(operPos);
}

function simplizeExpr(source) {
    return source.replace(/\(|\)/g, "").replace(/ /g, "");
}

function calcExprTable(pexp) {
    var ret = {};
    ret.valname = [];
    ret.expval = [];
    var vallist = {};
    var valIndex = 0;
    var matchResult = pexp.match(/\w/g);
    for (i in matchResult) {
        if (vallist[matchResult[i]] == undefined) {
            ret.valname.push(matchResult[i]);
            vallist[matchResult[i]] = valIndex;
            valIndex++;
        }
    }
    ret.valname.sort();
    for (var i = 0; i < 2 << (valIndex - 1); i++) {
        var exp = pexp;
        for (j in vallist)
            exp = exp.replace(new RegExp(j, "g"), (i >> (valIndex - 1 - vallist[j])) & 1);
        ret.expval.push(eval01Expr(exp));
    }
    return ret;
}

function eval01Expr(exp)
{
    var stack = "";
    for (var i = 0 ; i < exp.length; i++) {
        stack += exp[i];
        while (true) {
            if (stack.match("![01]"))
                stack = stack.substr(0, stack.length - 2) + Number(!Number((stack.charAt(stack.length - 1))));
            else if (stack.match(".([01]){2}")) {
                switch (stack.charAt(stack.length - 3)) {
                    case "&":
                        stack = stack.substr(0, stack.length - 3) + Number(Number(stack.charAt(stack.length - 2)) & Number(stack.charAt(stack.length - 1)));
                        break;
                    case "|":
                        stack = stack.substr(0, stack.length - 3) + Number(Number(stack.charAt(stack.length - 2)) | Number(stack.charAt(stack.length - 1)));
                        break;
                    case "^":
                        stack = stack.substr(0, stack.length - 3) + Number(!Number(stack.charAt(stack.length - 2)) | Number(stack.charAt(stack.length - 1)));
                        break;
                    case "~":
                        stack = stack.substr(0, stack.length - 3) + Number(!(Number(stack.charAt(stack.length - 2)) ^ Number(stack.charAt(stack.length - 1))));
                        break;
                }
            } else
                break;
        }
    }
    return Number(stack);
}

function drawTree() {
    if (!preexp)
        return;
    canvas = document.getElementById("ctree").getContext('2d');
    canvas.clearRect(0, 0, 800, 600);
    canvas.font = "14px Courier New";
    canvas.beginPath();
    //设置弧线的颜色为蓝色
    canvas.strokeStyle = "blue";
    canvas.arc(400, 20, 10, 0, Math.PI * 2, true);
    canvas.stroke();
    canvas.fillText("a", 400, 15);
}
