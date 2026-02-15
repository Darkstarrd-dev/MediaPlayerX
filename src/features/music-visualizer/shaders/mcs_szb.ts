import type { MusicVisualizerShaderDefinition } from '../types'

export const SHADER: MusicVisualizerShaderDefinition = {
  id: 'mcs-szb',
  label: 'Default',
  defaultEntry: true,
  fragmentSource: String.raw`const float HUE = 0.0;
const float HEADPHONE_OFFSET_X = 0.15;
const float SCENE_OFFSET_Y = 0.15;

// SVG rendering from: https://www.shadertoy.com/view/ldXyRn
#define N 16. // splines discretization. Lower it on slow GPUs

#define M(x, y) x0 = _x = x, y0 = _y = y, px = py = 0.0;
#define L(x, y) d = min(d, line(uv, vec2(_x, _y), vec2(x, y))); _x = x, _y = y, px = py = 0.0;
#define C(x1, y1, x2, y2, x, y) d = min(d, bezier(uv, vec2(_x, _y), vec2(x1, y1), vec2(x2, y2), vec2(x, y))); _x = x, _y = y, px = x - (x2), py = y - (y2);
#define S(x2, y2, x, y) C(_x + px, _y + py, x2, y2, x, y)
#define Q(x1, y1, x, y) d = min(d, bezier_quad(uv, vec2(_x, _y), vec2(x1, y1), vec2(x, y))); _x = x, _y = y, px = x - (x1), py = y - (y1);
#define T(x, y) Q(_x + px, _y + py, x, y)
#define H(x) d = min(d, line(uv, vec2(_x, _y), vec2(x, _y))); _x = x, px = py = 0.0;
#define V(y) d = min(d, line(uv, vec2(_x, _y), vec2(_x, y))); _y = y, px = py = 0.0;
//#define A(rx, ry, xrot, large, sweep, x, y) _x = x, _y = y, px = py = 1e8;
#define Z d = min(d, line(uv, vec2(_x, _y), vec2(x0, y0))), px = py = 0.0;

#define m(x, y) M(_x + x, _y + y)
#define l(x, y) L(_x + x, _y + y)
#define c(x1, y1, x2, y2, x, y) C(_x + x1, _y + y1, _x + x2, _y + y2, _x + x, _y + y)
#define s(x2, y2, x, y) S(_x + x2, _y + y2, _x + x, _y + y)
#define q(x1, y1, x, y) Q(_x + x1, _y + y1, _x + x, _y + y)
#define t(x, y) T(_x + x, _y + y)
#define h(x) H(_x + x)
#define v(y) V(_y + y)
//#define a(rx, ry, xrot, large, sweep, x, y) A(rx, ry, xrot, large, sweep, x, y)
#define z Z

#define style(f, c) fill = f; S = 1.; COL = mod(vec4((c) / 65536, (c) / 256, c, 1), 256.) / 255.;
#define path(cmd) _x = _y = x0 = y0 = px = py = 0.0, d = 1e8; cmd; draw(uv, d, O);

float bezier(vec2, vec2, vec2, vec2, vec2);
float bezier_quad(vec2, vec2, vec2, vec2);
float line(vec2, vec2, vec2);
float ellipse_arc(vec2, vec2, float, float, float, vec2);
void draw(vec2, float, inout vec4);
const float FILL = 1., CONTOUR = 0.;
vec4 COL = vec4(0); float fill = FILL, S = 1.;
float d = 1e38;

void SVG(vec2 uv, int headphoneCode, inout vec4 O)
{
    float _x, _y, x0, y0, px, py;
    uv.y = 1.0 - uv.y;

    uv = uv * 1.25 - vec2(0.3, 0.01);

uv *= vec2(134.6, 138.6);
// SVG optimized by custom software
path(style(FILL, headphoneCode)
m(117.,138.)q(-3.7,.0,-6.,-3.3)t(-2.,-8.6)V(88.)c(.0,-6.,2.8,-7.5,5.,-7.5)l(10.5,2.)V(51.)l(.8,-.8)h(1.)Q(111.,9.,67.5,6.5)h(-.6)Q(23.7,9.4,9.,50.3)h(.5)l(.8,.8)v(31.6)l(4.7,-1.2)l(6.,-.9)s(5.,1.3,5.,7.5)v(37.8)q(.0,5.5,-2.,8.6)t(-6.,3.3)H(1.5)l(-.8,-.8)V(51.)l(.8,-.8)h(1.)C(10.3,21.2,36.7,.9,67.,.8)h(.3)c(30.3,.0,56.7,20.4,64.5,49.6)h(1.5)l(.8,.8)v(86.)l(-.8,.8)h(-16.4)z
m(1.5,-15.4)c(.0,3.4,1.3,3.4,1.8,3.4)h(4.)V(93.)l(-6.,-.2)v(29.6)z
M(14.5,126.)s(1.8,.0,1.8,-3.4)V(93.)l(-6.,.2)v(33.)h(4.)z
)

}

vec2 interpolate(vec2 G1, vec2 G2, vec2 G3, vec2 G4, float t)
{
  return t * (t * (t * (G4 - G1 + 3. * (G2 - G3)) + 3. * (G1 - 2. * G2 + G3)) + 3. * (G2 - G1)) + G1;
}

vec2 interpolate_quad(vec2 G1, vec2 G2, vec2 G3, float t)
{
  return t * (t * (G3 - 2. * G2 + G1) + 2. * (G2 - G1)) + G1;
}

float line(vec2 p, vec2 a, vec2 b)
{
  vec2 pa = p - a, ba = b - a,
    d = pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.);
  if ((a.y > p.y) != (b.y > p.y) &&
      pa.x < ba.x * pa.y / ba.y) S = -S;
  return dot(d, d);
}

float bezier(vec2 uv, vec2 A, vec2 B, vec2 C, vec2 D)
{
  vec2 p = A;
  for (float t = 1.; t <= N; t++) {
    vec2 q = interpolate(A, B, C, D, t / N);
    float l = line(uv, p, q);
    d = min(d, l);
    p = q;
  }
  return d;
}

float bezier_quad(vec2 uv, vec2 A, vec2 B, vec2 C)
{
  vec2 p = A;
  for (float t = 1.; t <= N; t++) {
    vec2 q = interpolate_quad(A, B, C, t / N);
    float l = line(uv, p, q);
    d = min(d, l);
    p = q;
  }
  return d;
}

float ellipse_arc(vec2 uv, vec2 radii, float xrot, float large, float sweep, vec2 end)
{
    return 10000.0;
}

void draw(vec2 uv, float d, inout vec4 O)
{
  float f = length(fwidth(uv)) * 8.0;
  float shapeMask = 1.0 - smoothstep(-f * 2.0, 0.0, S * d * 8.0);
  shapeMask = clamp(shapeMask, 0.0, 1.0);
  O.rgb = mix(O.rgb, COL.rgb, shapeMask);
  O.a = max(O.a, shapeMask);
}

float elongate(vec2 p, float h) {
  vec2 q = abs(p) - vec2(0.0, h);
    p = sign(p) * max(q, 0.0);
  return length(p) - 0.011 + min(max(q.x, q.y), 0.0);
}

vec3 hue_shift(vec3 c, float s){
    return c * mat3(c += .33 - (c = vec3(cos(s), s = -sin(s) * .6, -s)).x / 3., c.zxy, c.yzx);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy + vec2(0.0, SCENE_OFFSET_Y);

    const vec2 scale = vec2(40, 1);
    float id = floor(uv.x * scale.x) / scale.x;
    vec2 iv = fract(uv * scale) * 2.0 - 1.0 + vec2(0.0, 0.3);
    float a = iResolution.y / iResolution.x;
    float music = texelFetch(iChannel0, ivec2(abs(id - 0.35) * 512.0, 0), 0).r;
    music = (1.0 - exp(-music * music)) * 0.5;
    music *= 2.3;
    float d = elongate(iv / scale * vec2(1.0, a), music);
  float f = length(fwidth(uv));
    d = smoothstep(-f, f, d);
    vec3 col = vec3(-0.2, -0.2, 0.5) + vec3(1.25, 1.0, 1.5) * (cos(1.5 * 3.1415 * (uv.xxx * vec3(2.25, 1.8, 0.6) + vec3(1.5, 1.0, -0.15))) * 0.5 + 0.5);
    col = hue_shift(col, HUE);
    float spectrumMask = 1.0 - d;
    vec3 themeBackground = clamp(iThemeBackgroundColor, vec3(0.0), vec3(1.0));
    bool layeredComposite = iCompositeMode == 2;
    float outputAlpha = layeredComposite ? spectrumMask : 1.0;
    vec3 outputColor = layeredComposite
      ? col * spectrumMask
      : mix(themeBackground, col, spectrumMask);

    fragColor = vec4(outputColor, outputAlpha);
    int headphoneCode = (iCompositeMode == 2 || iThemeMode == 1) ? 16777215 : 0;
    float minResolution = min(iResolution.x, iResolution.y);
    vec2 svgCoord = fragCoord - 0.5 * (iResolution.xy - vec2(minResolution));
    SVG(svgCoord / minResolution + vec2(HEADPHONE_OFFSET_X, SCENE_OFFSET_Y), headphoneCode, fragColor);
}
`,
}
