class Cube{

      constructor(){
        this.type='cube';
        //this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        //this.size = 5.0;
        this.matrix = new Matrix4();
    }
    
   // Render this shape
   render() {
      var rgba = this.color;
      //We have 4f below as we are passing 4 floating point values
      gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

      drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
      drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);

      //Fake the lighting by coloring different sides slightly different color
      gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);

      drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
      drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

      drawTriangle3D([1,1,0,  1,0,0,  1,1,1]);
      drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);

      drawTriangle3D([0,1,0,  0,0,0,  0,0,1]);
      drawTriangle3D([0,1,0,  0,0,1,  0,1,1]);

      drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
      drawTriangle3D([0,0,0,  1,0,1,  1,0,0]);

      drawTriangle3D([0,0,1,  0,1,1,  1,1,1]);
      drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
   }
 }