(function (React) {
  "use strict";

  function _interopDefault(e) {
    return e && e.__esModule ? e : { default: e };
  }

  var React__default = /*#__PURE__*/ _interopDefault(React);

  const VariantsEditComponent = (props) => {
    const { onChange, property, record } = props;
    const variants = record.params[property.path] || [];
    const handleAddVariant = () => {
      onChange(property.path, [
        ...variants,
        {
          name: "",
          price: 0,
        },
      ]);
    };
    const handleChange = (index, key, value) => {
      const updatedVariants = [...variants];
      updatedVariants[index][key] = value;
      onChange(property.path, updatedVariants);
    };
    const handleRemove = (index) => {
      const updatedVariants = variants.filter((_, i) => i !== index);
      onChange(property.path, updatedVariants);
    };
    return /*#__PURE__*/ React__default.default.createElement(
      "div",
      null,
      variants.map((variant, i) =>
        /*#__PURE__*/ React__default.default.createElement(
          "div",
          {
            key: i,
            style: {
              marginBottom: "1rem",
              border: "1px solid #ccc",
              padding: "1rem",
            },
          },
          /*#__PURE__*/ React__default.default.createElement(
            "label",
            null,
            "Name:",
            /*#__PURE__*/ React__default.default.createElement("input", {
              type: "text",
              value: variant.name || "",
              onChange: (e) => handleChange(i, "name", e.target.value),
              style: {
                marginLeft: "0.5rem",
              },
            }),
          ),
          /*#__PURE__*/ React__default.default.createElement("br", null),
          /*#__PURE__*/ React__default.default.createElement(
            "label",
            null,
            "Price:",
            /*#__PURE__*/ React__default.default.createElement("input", {
              type: "number",
              value: variant.price || 0,
              onChange: (e) =>
                handleChange(i, "price", parseFloat(e.target.value)),
              style: {
                marginLeft: "0.5rem",
              },
            }),
          ),
          /*#__PURE__*/ React__default.default.createElement("br", null),
          /*#__PURE__*/ React__default.default.createElement(
            "button",
            {
              type: "button",
              onClick: () => handleRemove(i),
              style: {
                marginTop: "0.5rem",
              },
            },
            "Remove",
          ),
        ),
      ),
      /*#__PURE__*/ React__default.default.createElement(
        "button",
        {
          type: "button",
          onClick: handleAddVariant,
        },
        "Add Variant",
      ),
    );
  };

  const ShareLinkComponent = (props) => {
    const { record, property } = props;
    const shareLink = record.params[property.path];
    return /*#__PURE__*/ React__default.default.createElement(
      "div",
      null,
      shareLink
        ? /*#__PURE__*/ React__default.default.createElement(
            "a",
            {
              href: shareLink,
              target: "_blank",
              rel: "noopener noreferrer",
            },
            shareLink,
          )
        : /*#__PURE__*/ React__default.default.createElement(
            "span",
            null,
            "No share link available.",
          ),
    );
  };

  AdminJS.UserComponents = {};
  AdminJS.UserComponents.VariantsEditComponent = VariantsEditComponent;
  AdminJS.UserComponents.ShareLinkComponent = ShareLinkComponent;
})(React);
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlLmpzIiwic291cmNlcyI6WyIuLi9jb21wb25lbnRzL1ZhcmlhbnRzRWRpdENvbXBvbmVudC5qc3giLCIuLi9jb21wb25lbnRzL1NoYXJlTGlua0NvbXBvbmVudC5qc3giLCJlbnRyeS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXHJcblxyXG5jb25zdCBWYXJpYW50c0VkaXRDb21wb25lbnQgPSAocHJvcHMpID0+IHtcclxuICBjb25zdCB7IG9uQ2hhbmdlLCBwcm9wZXJ0eSwgcmVjb3JkIH0gPSBwcm9wc1xyXG4gIGNvbnN0IHZhcmlhbnRzID0gcmVjb3JkLnBhcmFtc1twcm9wZXJ0eS5wYXRoXSB8fCBbXVxyXG5cclxuICBjb25zdCBoYW5kbGVBZGRWYXJpYW50ID0gKCkgPT4ge1xyXG4gICAgb25DaGFuZ2UocHJvcGVydHkucGF0aCwgWy4uLnZhcmlhbnRzLCB7IG5hbWU6ICcnLCBwcmljZTogMCB9XSlcclxuICB9XHJcblxyXG4gIGNvbnN0IGhhbmRsZUNoYW5nZSA9IChpbmRleCwga2V5LCB2YWx1ZSkgPT4ge1xyXG4gICAgY29uc3QgdXBkYXRlZFZhcmlhbnRzID0gWy4uLnZhcmlhbnRzXVxyXG4gICAgdXBkYXRlZFZhcmlhbnRzW2luZGV4XVtrZXldID0gdmFsdWVcclxuICAgIG9uQ2hhbmdlKHByb3BlcnR5LnBhdGgsIHVwZGF0ZWRWYXJpYW50cylcclxuICB9XHJcblxyXG4gIGNvbnN0IGhhbmRsZVJlbW92ZSA9IChpbmRleCkgPT4ge1xyXG4gICAgY29uc3QgdXBkYXRlZFZhcmlhbnRzID0gdmFyaWFudHMuZmlsdGVyKChfLCBpKSA9PiBpICE9PSBpbmRleClcclxuICAgIG9uQ2hhbmdlKHByb3BlcnR5LnBhdGgsIHVwZGF0ZWRWYXJpYW50cylcclxuICB9XHJcblxyXG4gIHJldHVybiAoXHJcbiAgICA8ZGl2PlxyXG4gICAgICB7dmFyaWFudHMubWFwKCh2YXJpYW50LCBpKSA9PiAoXHJcbiAgICAgICAgPGRpdiBrZXk9e2l9IHN0eWxlPXt7IG1hcmdpbkJvdHRvbTogJzFyZW0nLCBib3JkZXI6ICcxcHggc29saWQgI2NjYycsIHBhZGRpbmc6ICcxcmVtJyB9fT5cclxuICAgICAgICAgIDxsYWJlbD5cclxuICAgICAgICAgICAgTmFtZTpcclxuICAgICAgICAgICAgPGlucHV0XHJcbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxyXG4gICAgICAgICAgICAgIHZhbHVlPXt2YXJpYW50Lm5hbWUgfHwgJyd9XHJcbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBoYW5kbGVDaGFuZ2UoaSwgJ25hbWUnLCBlLnRhcmdldC52YWx1ZSl9XHJcbiAgICAgICAgICAgICAgc3R5bGU9e3sgbWFyZ2luTGVmdDogJzAuNXJlbScgfX1cclxuICAgICAgICAgICAgLz5cclxuICAgICAgICAgIDwvbGFiZWw+XHJcbiAgICAgICAgICA8YnIgLz5cclxuICAgICAgICAgIDxsYWJlbD5cclxuICAgICAgICAgICAgUHJpY2U6XHJcbiAgICAgICAgICAgIDxpbnB1dFxyXG4gICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxyXG4gICAgICAgICAgICAgIHZhbHVlPXt2YXJpYW50LnByaWNlIHx8IDB9XHJcbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBoYW5kbGVDaGFuZ2UoaSwgJ3ByaWNlJywgcGFyc2VGbG9hdChlLnRhcmdldC52YWx1ZSkpfVxyXG4gICAgICAgICAgICAgIHN0eWxlPXt7IG1hcmdpbkxlZnQ6ICcwLjVyZW0nIH19XHJcbiAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICA8L2xhYmVsPlxyXG4gICAgICAgICAgPGJyIC8+XHJcbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiBoYW5kbGVSZW1vdmUoaSl9IHN0eWxlPXt7IG1hcmdpblRvcDogJzAuNXJlbScgfX0+XHJcbiAgICAgICAgICAgIFJlbW92ZVxyXG4gICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgICkpfVxyXG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtoYW5kbGVBZGRWYXJpYW50fT5BZGQgVmFyaWFudDwvYnV0dG9uPlxyXG4gICAgPC9kaXY+XHJcbiAgKVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBWYXJpYW50c0VkaXRDb21wb25lbnQiLCJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnXHJcblxyXG5jb25zdCBTaGFyZUxpbmtDb21wb25lbnQgPSAocHJvcHMpID0+IHtcclxuICBjb25zdCB7IHJlY29yZCwgcHJvcGVydHkgfSA9IHByb3BzXHJcbiAgY29uc3Qgc2hhcmVMaW5rID0gcmVjb3JkLnBhcmFtc1twcm9wZXJ0eS5wYXRoXVxyXG5cclxuICByZXR1cm4gKFxyXG4gICAgPGRpdj5cclxuICAgICAge3NoYXJlTGluayA/IChcclxuICAgICAgICA8YSBocmVmPXtzaGFyZUxpbmt9IHRhcmdldD1cIl9ibGFua1wiIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIj5cclxuICAgICAgICAgIHtzaGFyZUxpbmt9XHJcbiAgICAgICAgPC9hPlxyXG4gICAgICApIDogKFxyXG4gICAgICAgIDxzcGFuPk5vIHNoYXJlIGxpbmsgYXZhaWxhYmxlLjwvc3Bhbj5cclxuICAgICAgKX1cclxuICAgIDwvZGl2PlxyXG4gIClcclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgU2hhcmVMaW5rQ29tcG9uZW50IiwiQWRtaW5KUy5Vc2VyQ29tcG9uZW50cyA9IHt9XG5pbXBvcnQgVmFyaWFudHNFZGl0Q29tcG9uZW50IGZyb20gJy4uL2NvbXBvbmVudHMvVmFyaWFudHNFZGl0Q29tcG9uZW50J1xuQWRtaW5KUy5Vc2VyQ29tcG9uZW50cy5WYXJpYW50c0VkaXRDb21wb25lbnQgPSBWYXJpYW50c0VkaXRDb21wb25lbnRcbmltcG9ydCBTaGFyZUxpbmtDb21wb25lbnQgZnJvbSAnLi4vY29tcG9uZW50cy9TaGFyZUxpbmtDb21wb25lbnQnXG5BZG1pbkpTLlVzZXJDb21wb25lbnRzLlNoYXJlTGlua0NvbXBvbmVudCA9IFNoYXJlTGlua0NvbXBvbmVudCJdLCJuYW1lcyI6WyJWYXJpYW50c0VkaXRDb21wb25lbnQiLCJwcm9wcyIsIm9uQ2hhbmdlIiwicHJvcGVydHkiLCJyZWNvcmQiLCJ2YXJpYW50cyIsInBhcmFtcyIsInBhdGgiLCJoYW5kbGVBZGRWYXJpYW50IiwibmFtZSIsInByaWNlIiwiaGFuZGxlQ2hhbmdlIiwiaW5kZXgiLCJrZXkiLCJ2YWx1ZSIsInVwZGF0ZWRWYXJpYW50cyIsImhhbmRsZVJlbW92ZSIsImZpbHRlciIsIl8iLCJpIiwiUmVhY3QiLCJjcmVhdGVFbGVtZW50IiwibWFwIiwidmFyaWFudCIsInN0eWxlIiwibWFyZ2luQm90dG9tIiwiYm9yZGVyIiwicGFkZGluZyIsInR5cGUiLCJlIiwidGFyZ2V0IiwibWFyZ2luTGVmdCIsInBhcnNlRmxvYXQiLCJvbkNsaWNrIiwibWFyZ2luVG9wIiwiU2hhcmVMaW5rQ29tcG9uZW50Iiwic2hhcmVMaW5rIiwiaHJlZiIsInJlbCIsIkFkbWluSlMiLCJVc2VyQ29tcG9uZW50cyJdLCJtYXBwaW5ncyI6Ijs7Ozs7OztFQUVBLE1BQU1BLHFCQUFxQixHQUFJQyxLQUFLLElBQUs7SUFDdkMsTUFBTTtNQUFFQyxRQUFRO01BQUVDLFFBQVE7RUFBRUMsSUFBQUE7RUFBTyxHQUFDLEdBQUdILEtBQUs7SUFDNUMsTUFBTUksUUFBUSxHQUFHRCxNQUFNLENBQUNFLE1BQU0sQ0FBQ0gsUUFBUSxDQUFDSSxJQUFJLENBQUMsSUFBSSxFQUFFO0lBRW5ELE1BQU1DLGdCQUFnQixHQUFHQSxNQUFNO01BQzdCTixRQUFRLENBQUNDLFFBQVEsQ0FBQ0ksSUFBSSxFQUFFLENBQUMsR0FBR0YsUUFBUSxFQUFFO0VBQUVJLE1BQUFBLElBQUksRUFBRSxFQUFFO0VBQUVDLE1BQUFBLEtBQUssRUFBRTtFQUFFLEtBQUMsQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRCxNQUFNQyxZ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
