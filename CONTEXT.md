# MDX Handwritten

MDX Handwritten is a language for adding accessible, handwritten editorial expression to blog content.

## Language

**Annotation gesture**:
A distinct editorial action an author applies to content to communicate intent or guide the reader's attention. Its identity comes from what it expresses, not from its font or surface treatment.
_Avoid_: Handwriting style, font style, visual effect

**Annotation scene**:
A composed explanation that coordinates content and one or more annotation gestures as a single expressive unit. The author supplies the intended meaning and relationships; the system owns presentation details wherever possible.
_Avoid_: Hand-built illustration, fixed layout

**Annotation recipe**:
A named convention that turns recognizable source content and an author's intent into an annotation scene. It supplies shared meanings and relationships so authors do not have to repeat them.
_Avoid_: Template, visual preset

**Scene plan**:
A reviewable description of an annotation scene's targets, labels, relationships, and gestures, independent of their final geometric arrangement.
_Avoid_: Rendered scene, pixel layout

**Visual style**:
The appearance used to render an annotation gesture without changing what that gesture communicates.
_Avoid_: Annotation gesture
