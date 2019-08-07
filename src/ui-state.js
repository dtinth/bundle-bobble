import { observable } from "mobx";

export default observable({
  focus: null,
  expanded: new Map()
});
