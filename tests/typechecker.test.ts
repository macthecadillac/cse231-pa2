import * as mocha from 'mocha';
import { expect } from 'chai';
import { parser } from 'lezer-python';
import { parseProgram } from '../parser';
import { checkReturnType, typeCheckProgram, inferExprType } from '../typechecker';

describe('inferExprType(expr, varScope, funcScope)', () => {
})
