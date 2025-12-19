Calculating the shortest distance between two rectangles

Recently I did coursework where we designed a robot and competed virtually in the Webots simulated environment. If you are interested, our code and CAD are on GitHub. The code segments included in this blog post are taken directly from our robot controller, which is released under the MIT License.

Long story short, I needed a way to calculate the shortest distance between two robots for collision avoidance, knowing the coordinates of the vertices of each bounding box. The reason I didn’t just use two circles was that our robot design is asymmetric, and it doesn’t rotate around its centre. Use two larger circles you may say, and you would be right. But for fun let’s continue 🤡.

If your deadline is coming up, and you don’t need this… Stop reading now, and just use two circles 🤣

Since rectangles have straight edges, the segment of the shortest distance must have one end originates from a vertex, so the name of the game becomes calculating the shortest distance from a point to a line segment, doing it for all vertices with all sides of the other rectangle, and finding the minimum. As you can see, calculating it will not be particularly cheap.

Shortest distance from a point to a line segment
There are two possibilities:

The point lies in the shadow of the line segment, and the shortest distance is the vertical distance to the line
The point lies outside the shadow, the shortest distance is that to the closest endpoint of the line segment
Checking if a point is in line shadow
This is just a fancy way of saying a line perpendicular to the line segment passing through the given point intersects the line segment. One way of checking this is to compare the dot product between the unit direction vector if the line segment and the vector pointing from one end of the line segment to the point, with the length of the line segment:

def point_in_line_shadow(p1: np.ndarray, p2: np.ndarray, q: np.ndarray) -> bool:
    segment_length = np.linalg.norm(p2 - p1)
    segment_dir = (p2 - p1) / segment_length
    projection = np.dot(q - p1, segment_dir)

    return 0 < projection < segment_length

Getting the shortest distance
The perpendicular distance can be found by taking the cross product between the unit direction vector and vector from an endpoint to the given point. Combining this with in line shadow check:

def get_min_distance_to_segment(p1: np.ndarray, p2: np.ndarray, q: np.ndarray) -> float:
    return np.linalg.norm(np.cross(
        (p2 - p1) / np.linalg.norm(p2 - p1),
        q - p1
    )) if point_in_line_shadow(p1, p2, q) else min(
        np.linalg.norm(q - p1), np.linalg.norm(q - p2)
    )

Doing this for all points with all sides
Let’s first write a helper function to return pairs of coordinates of endpoints of all sides from the vertices of the rectangle, specified in a clockwise manner.

def get_rectangle_sides(vertices: list) -> list:
    return list(map(
        lambda i: (vertices[i], vertices[(i + 1) % 4]),
        range(4)
    ))

Then we can write a function to calculate the minimum distance from the point to all sides of the other rectangle, using get_min_distance_to_segment earlier.

def get_min_distance_point_rectangle(rect_sides: list, q: np.ndarray) -> float:
    return min(map(
        lambda side: get_min_distance_to_segment(*side, q),
        rect_sides
    ))

Finally, combine the two functions above.

def get_min_distance_rectangles(r1: list, r2: list) -> float:
    r1 = list(map(np.asarray, r1))
    r2 = list(map(np.asarray, r2))

    min_r1_to_r2 = min(map(
        partial(
            get_min_distance_point_rectangle,
            get_rectangle_sides(r2)
        ),
        r1
    ))

    min_r2_to_r1 = min(map(
        partial(
            get_min_distance_point_rectangle,
            get_rectangle_sides(r1)
        ),
        r2
    ))

    return min(min_r1_to_r2, min_r2_to_r1)