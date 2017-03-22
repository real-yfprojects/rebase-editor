'use strict';

const Terminal = require('../lib/terminal'),
  mockTerminal = require('./mock-terminal'),
  getState = require('./state-gen');

const noopLines = [{
  action: 'noop'
}];

describe('Terminal renderer', function () {
  let mockTerm;

  beforeEach(function () {
    mockTerm = mockTerminal.create();
  });

  describe('constructor', function () {
    it('should call fullscreen', function () {
      new Terminal(mockTerm);
      expect(mockTerm.fullscreen).to.be.calledWith(true);
      expect(mockTerm.grabInput).to.be.calledWith();
    });
  });

  describe('render', function () {

    function trim(str) {
      return str.trim().split('\n').map((line) => line.trimLeft()).join('\n');
    }

    function expectRendered(str, from, to) {
      let lines = mockTerm.getRendered();
      if (from || to) {
        lines = lines.slice(from, to);
      }
      if (typeof str === 'string') {
        expect(lines.join('\n')).to.equal(trim(str));
      } else {
        expect(lines).to.deep.equal(str);
      }
    }

    it('should render lines', function () {
      const terminal = new Terminal(mockTerm);
      terminal.render(getState(2, 0, 2));
      expectRendered(`
          ^!pick 123 Line 0
          pick 123 Line 1

          # Info 0
          # Info 1
          `);
      expect(mockTerm.getCursorPos()).to.equal(1);
    });

    it('should only render changed line', function () {
      const oldState = getState(2, 0, 1);
      const state = {
        lines: [{
          action: 'fixup',
          hash: '123',
          message: 'Hello'
        }, oldState.lines[1]],
        info: oldState.info,
        cursor: oldState.cursor
      };
      const terminal = new Terminal(mockTerm);
      terminal.render(oldState);
      mockTerm.reset();
      terminal.render(state);
      expectRendered(`
          ^!fixup 123 Hello
          `);
      expect(mockTerm.clear).not.to.be.called;
    });

    it('should render noop', function () {
      const state = getState(noopLines, 0, 1);

      const terminal = new Terminal(mockTerm);
      terminal.render(state);
      expectRendered(`
          ^!noop

          # Info 0
          `);
    });

    it('should highligt selected lines', function () {
      const state = getState(4, {
        from: 2,
        pos: 1
      }, 1);
      const terminal = new Terminal(mockTerm);
      terminal.render(state);
      expectRendered(`
        pick 123 Line 0
        ^!pick 123 Line 1
        ^!pick 123 Line 2
        pick 123 Line 3

        # Info 0
        `);
    });

    it('should highligt selected lines crossing 10', function () {
      const state = getState(15, {
        from: 9,
        pos: 10
      }, 1);
      const terminal = new Terminal(mockTerm);
      terminal.render(state);
      expectRendered(`
        pick 123 Line 8
        ^!pick 123 Line 9
        ^!pick 123 Line 10
        pick 123 Line 11
        `, 8, 12);
    });

    it('should only render visible lines', function () {
      const state = getState(4, 0);
      const terminal = new Terminal(mockTerm);
      mockTerm.height = 2;
      terminal.render(state);
      expectRendered(`
        ^!pick 123 Line 0
        pick 123 Line 1
        `);
    });

    it('should only render visible info lines', function () {
      const state = getState(1, 0, 3);
      const terminal = new Terminal(mockTerm);
      mockTerm.height = 3;
      terminal.render(state);
      expectRendered(`
        ^!pick 123 Line 0

        # Info 0
        `);
    });

    it('should scroll down on bottom', function () {
      const state = getState(8, 6);
      const terminal = new Terminal(mockTerm);
      mockTerm.height = 4;
      terminal.render(state);
      expectRendered(`
        pick 123 Line 3
        pick 123 Line 4
        pick 123 Line 5
        ^!pick 123 Line 6
        `);
      const newState = {
        cursor: {
          pos: 7,
          from: 7
        },
        lines: state.lines,
        info: state.info
      };
      terminal.render(newState);
      expectRendered(`
        pick 123 Line 4
        pick 123 Line 5
        pick 123 Line 6
        ^!pick 123 Line 7
        `);
    });

    describe('with status', function () {
      it('should render if enabled', function () {
        const state = getState(2, 0, 1);
        const terminal = new Terminal(mockTerm, {
          status: true
        });
        mockTerm.height = 20;
        terminal.render(state, 'up', 'UP');
        expectRendered(`
          ^+^_Cursor: 0 From: 0 Key: up  Raw key: UP Height: 20
          ^!pick 123 Line 0
          pick 123 Line 1

          # Info 0
          `);
        expect(mockTerm.getCursorPos()).to.equal(2);
      });

      it('should scroll on last line', function () {
        const state = getState(4, 2);
        const terminal = new Terminal(mockTerm, {
          status: true
        });
        mockTerm.height = 3;
        terminal.render(state, 'up', 'UP');
        expectRendered(`
          ^+^_Cursor: 2 From: 2 Key: up  Raw key: UP Height: 3
          pick 123 Line 1
          ^!pick 123 Line 2
          `);
      });
    });

    describe('with color', function () {
      it('should render colors if enabled', function () {
        const state = getState(2, 0, 1);
        const terminal = new Terminal(mockTerm, {
          colors: true
        });
        terminal.render(state);
        expectRendered(`
          ^!pick 123 Line 0
          ^rpick ^y123^ Line 1

          # Info 0
      `);
      });

      it('should render noop', function () {
        const state = getState(noopLines, 0, 1);
        const terminal = new Terminal(mockTerm, {
          colors: true
        });
        terminal.render(state);
        expectRendered(`
            ^!noop

            # Info 0
            `);
      });
    });
  });
});
